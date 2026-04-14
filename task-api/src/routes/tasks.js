const express = require('express');
const router = express.Router();
const taskService = require('../services/taskService');
const {
  validateCreateTask,
  validateUpdateTask,
  validateAssignTask,
  validateListQuery,
} = require('../utils/validators');

router.get('/stats', (req, res) => {
  const stats = taskService.getStats();
  res.json(stats);
});

router.get('/', (req, res) => {
  const { status, assignee, page, limit } = req.query;

  // Validate all list query params up-front to keep error semantics predictable.
  const queryError = validateListQuery(req.query);
  if (queryError) {
    return res.status(400).json({ error: queryError });
  }

  // Build result set in stages so filters and pagination can be combined.
  let tasks = taskService.getAll();

  if (status) {
    tasks = tasks.filter((task) => task.status === status);
  }

  if (assignee) {
    const normalizedAssignee = assignee.trim().toLowerCase();
    tasks = tasks.filter(
      (task) => typeof task.assignee === 'string' && task.assignee.toLowerCase() === normalizedAssignee
    );
  }

  if (page !== undefined || limit !== undefined) {
    // Support partial pagination input by applying defaults for omitted fields.
    const pageNum = page === undefined ? 1 : Number(page);
    const limitNum = limit === undefined ? 10 : Number(limit);
    tasks = taskService.getPaginated(pageNum, limitNum, tasks);
  }

  res.json(tasks);
});

// Direct lookup endpoint to avoid fetching a full collection for one task.
router.get('/:id', (req, res) => {
  const task = taskService.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

router.post('/', (req, res) => {
  const error = validateCreateTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.create(req.body);
  res.status(201).json(task);
});

router.put('/:id', (req, res) => {
  const error = validateUpdateTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.update(req.params.id, req.body);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

router.delete('/:id', (req, res) => {
  const deleted = taskService.remove(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.status(204).send();
});

router.patch('/:id/complete', (req, res) => {
  const task = taskService.completeTask(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

router.patch('/:id/assign', (req, res) => {
  const error = validateAssignTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const result = taskService.assignTask(req.params.id, req.body.assignee);
  if (result.error === 'not_found') {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Reassignment conflict is explicit to prevent accidental ownership overwrite.
  if (result.error === 'already_assigned') {
    return res.status(409).json({ error: 'Task is already assigned to another user' });
  }

  res.json(result.task);
});

module.exports = router;
