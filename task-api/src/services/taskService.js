const { v4: uuidv4 } = require('uuid');

let tasks = [];

// Only these keys can be changed through update operations.
const MUTABLE_FIELDS = ['title', 'description', 'status', 'priority', 'dueDate', 'assignee'];

// Return shallow copies so callers cannot mutate in-memory state by reference.
const cloneTask = (task) => ({ ...task });

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const normalizeMutableFields = (fields) => {
  const normalized = { ...fields };

  if (typeof normalized.title === 'string') {
    normalized.title = normalized.title.trim();
  }

  if (typeof normalized.description === 'string') {
    normalized.description = normalized.description.trim();
  }

  if (typeof normalized.assignee === 'string') {
    normalized.assignee = normalized.assignee.trim();
  }

  return normalized;
};

const getAll = () => tasks.map(cloneTask);

const findById = (id) => {
  const task = tasks.find((t) => t.id === id);
  return task ? cloneTask(task) : undefined;
};

const getByStatus = (status) => tasks.filter((t) => t.status === status).map(cloneTask);

const getByAssignee = (assignee) => {
  // Case-insensitive matching keeps filtering user-friendly across clients.
  const normalizedAssignee = assignee.toLowerCase().trim();
  return tasks
    .filter((t) => typeof t.assignee === 'string' && t.assignee.toLowerCase() === normalizedAssignee)
    .map(cloneTask);
};

const getPaginated = (page, limit, sourceTasks = tasks) => {
  // Clamp to safe minimums so service stays deterministic for bad numeric inputs.
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const offset = (safePage - 1) * safeLimit;

  return sourceTasks.slice(offset, offset + safeLimit).map(cloneTask);
};

const getStats = () => {
  const now = new Date();
  const counts = { todo: 0, in_progress: 0, done: 0 };
  let overdue = 0;

  tasks.forEach((t) => {
    if (counts[t.status] !== undefined) counts[t.status]++;
    if (t.dueDate && t.status !== 'done' && new Date(t.dueDate) < now) {
      overdue++;
    }
  });

  return { ...counts, overdue };
};

const create = ({
  title,
  description = '',
  status = 'todo',
  priority = 'medium',
  dueDate = null,
  assignee = null,
}) => {
  const task = {
    id: uuidv4(),
    title: title.trim(),
    description: description.trim(),
    status,
    priority,
    dueDate,
    assignee: typeof assignee === 'string' ? assignee.trim() : null,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };

  if (task.status === 'done') {
    // Keep create() consistent with completion semantics used elsewhere.
    task.completedAt = new Date().toISOString();
  }

  tasks.push(task);
  return cloneTask(task);
};

const update = (id, fields) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const safeUpdates = {};
  // Ignore unknown keys so immutable fields cannot be overridden by clients.
  for (const key of MUTABLE_FIELDS) {
    if (hasOwn(fields, key)) {
      safeUpdates[key] = fields[key];
    }
  }

  const normalizedUpdates = normalizeMutableFields(safeUpdates);
  const updated = { ...tasks[index], ...normalizedUpdates };

  // Keep completion timestamp aligned with status transitions.
  if (hasOwn(normalizedUpdates, 'status')) {
    if (updated.status === 'done') {
      updated.completedAt = tasks[index].completedAt || new Date().toISOString();
    } else {
      updated.completedAt = null;
    }
  }

  tasks[index] = updated;
  return cloneTask(updated);
};

const remove = (id) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;

  tasks.splice(index, 1);
  return true;
};

const completeTask = (id) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const task = tasks[index];

  const updated = {
    ...task,
    status: 'done',
    completedAt: task.completedAt || new Date().toISOString(),
  };

  tasks[index] = updated;
  return cloneTask(updated);
};

const assignTask = (id, assignee) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) {
    return { error: 'not_found', task: null };
  }

  const normalizedAssignee = assignee.trim();
  const current = tasks[index];

  // Prevent accidental reassignment via assign endpoint.
  if (current.assignee && current.assignee !== normalizedAssignee) {
    return { error: 'already_assigned', task: cloneTask(current) };
  }

  // Repeating same assignee is treated as an idempotent success.
  if (current.assignee === normalizedAssignee) {
    return { error: null, task: cloneTask(current) };
  }

  const updated = {
    ...current,
    assignee: normalizedAssignee,
  };

  tasks[index] = updated;
  return { error: null, task: cloneTask(updated) };
};

const _reset = () => {
  tasks = [];
};

module.exports = {
  getAll,
  findById,
  getByStatus,
  getByAssignee,
  getPaginated,
  getStats,
  create,
  update,
  remove,
  completeTask,
  assignTask,
  _reset,
};
