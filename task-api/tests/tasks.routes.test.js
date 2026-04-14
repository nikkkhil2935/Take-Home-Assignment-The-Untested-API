const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('tasks routes', () => {
  beforeEach(() => {
    taskService._reset();
  });

  test('GET /tasks returns all tasks', async () => {
    taskService.create({ title: 'Task A' });
    taskService.create({ title: 'Task B' });

    const response = await request(app).get('/tasks');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  test('GET /tasks validates query parameters', async () => {
    const badStatus = await request(app).get('/tasks?status=invalid');
    const badPage = await request(app).get('/tasks?page=0');
    const badLimit = await request(app).get('/tasks?limit=999');

    expect(badStatus.status).toBe(400);
    expect(badPage.status).toBe(400);
    expect(badLimit.status).toBe(400);
  });

  test('GET /tasks supports status + assignee filtering with pagination', async () => {
    taskService.create({ title: 'Task 1', status: 'todo', assignee: 'Alice' });
    taskService.create({ title: 'Task 2', status: 'todo', assignee: 'Alice' });
    taskService.create({ title: 'Task 3', status: 'todo', assignee: 'Bob' });
    taskService.create({ title: 'Task 4', status: 'done', assignee: 'Alice' });

    const response = await request(app).get('/tasks?status=todo&assignee=alice&page=1&limit=1');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe('Task 1');
  });

  test('GET /tasks applies pagination defaults when only page or limit is provided', async () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });

    const withLimitOnly = await request(app).get('/tasks?limit=1');
    const withPageOnly = await request(app).get('/tasks?page=1');

    expect(withLimitOnly.status).toBe(200);
    expect(withLimitOnly.body).toHaveLength(1);
    expect(withPageOnly.status).toBe(200);
    expect(withPageOnly.body).toHaveLength(2);
  });

  test('GET /tasks/:id returns a single task or 404', async () => {
    const created = taskService.create({ title: 'Find me' });

    const found = await request(app).get(`/tasks/${created.id}`);
    const missing = await request(app).get('/tasks/does-not-exist');

    expect(found.status).toBe(200);
    expect(found.body.id).toBe(created.id);
    expect(missing.status).toBe(404);
  });

  test('POST /tasks creates a task', async () => {
    const response = await request(app).post('/tasks').send({
      title: 'Create task',
      priority: 'high',
    });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe('Create task');
    expect(response.body.priority).toBe('high');
    expect(response.body.status).toBe('todo');
  });

  test('POST /tasks rejects invalid payloads', async () => {
    const noTitle = await request(app).post('/tasks').send({ priority: 'low' });
    const badDueDate = await request(app).post('/tasks').send({
      title: 'Bad date',
      dueDate: 'not-a-date',
    });

    expect(noTitle.status).toBe(400);
    expect(badDueDate.status).toBe(400);
  });

  test('PUT /tasks/:id updates a task', async () => {
    const created = taskService.create({ title: 'Old title', status: 'todo' });

    const response = await request(app).put(`/tasks/${created.id}`).send({
      title: 'New title',
      status: 'in_progress',
    });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('New title');
    expect(response.body.status).toBe('in_progress');
  });

  test('PUT /tasks/:id validates payload and handles missing tasks', async () => {
    const emptyBody = await request(app).put('/tasks/missing').send({});
    const missingTask = await request(app).put('/tasks/missing').send({ title: 'Will fail' });

    expect(emptyBody.status).toBe(400);
    expect(missingTask.status).toBe(404);
  });

  test('DELETE /tasks/:id deletes a task', async () => {
    const created = taskService.create({ title: 'Delete me' });

    const response = await request(app).delete(`/tasks/${created.id}`);
    const afterDelete = await request(app).get(`/tasks/${created.id}`);

    expect(response.status).toBe(204);
    expect(afterDelete.status).toBe(404);
  });

  test('DELETE /tasks/:id returns 404 for unknown tasks', async () => {
    const response = await request(app).delete('/tasks/missing');
    expect(response.status).toBe(404);
  });

  test('PATCH /tasks/:id/complete marks a task complete', async () => {
    const created = taskService.create({ title: 'Complete me', priority: 'high' });

    const response = await request(app).patch(`/tasks/${created.id}/complete`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('done');
    expect(response.body.priority).toBe('high');
    expect(response.body.completedAt).toEqual(expect.any(String));
  });

  test('PATCH /tasks/:id/complete returns 404 for unknown tasks', async () => {
    const response = await request(app).patch('/tasks/missing/complete');
    expect(response.status).toBe(404);
  });

  test('PATCH /tasks/:id/assign assigns a user and supports idempotent repeat', async () => {
    const created = taskService.create({ title: 'Assign me' });

    const firstAssign = await request(app).patch(`/tasks/${created.id}/assign`).send({ assignee: 'Alice' });
    const secondAssign = await request(app).patch(`/tasks/${created.id}/assign`).send({ assignee: 'Alice' });

    expect(firstAssign.status).toBe(200);
    expect(firstAssign.body.assignee).toBe('Alice');
    expect(secondAssign.status).toBe(200);
    expect(secondAssign.body.assignee).toBe('Alice');
  });

  test('PATCH /tasks/:id/assign validates payload, missing tasks, and conflicts', async () => {
    const created = taskService.create({ title: 'Ownership test' });

    await request(app).patch(`/tasks/${created.id}/assign`).send({ assignee: 'Alice' });

    const emptyAssignee = await request(app)
      .patch(`/tasks/${created.id}/assign`)
      .send({ assignee: '   ' });
    const missingTask = await request(app).patch('/tasks/missing/assign').send({ assignee: 'Alice' });
    const conflict = await request(app).patch(`/tasks/${created.id}/assign`).send({ assignee: 'Bob' });

    expect(emptyAssignee.status).toBe(400);
    expect(missingTask.status).toBe(404);
    expect(conflict.status).toBe(409);
  });

  test('GET /tasks/stats returns counts by status and overdue tasks', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    taskService.create({ title: 'todo overdue', status: 'todo', dueDate: yesterday });
    taskService.create({ title: 'done overdue but excluded', status: 'done', dueDate: yesterday });

    const response = await request(app).get('/tasks/stats');

    expect(response.status).toBe(200);
    expect(response.body.todo).toBe(1);
    expect(response.body.done).toBe(1);
    expect(response.body.overdue).toBe(1);
  });

  test('unknown routes return JSON 404', async () => {
    const response = await request(app).get('/not-a-route');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Route not found' });
  });

  test('unexpected route errors are handled by the error middleware', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const serviceSpy = jest.spyOn(taskService, 'getAll').mockImplementation(() => {
      throw new Error('simulated failure');
    });

    const response = await request(app).get('/tasks');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal server error' });

    serviceSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});
