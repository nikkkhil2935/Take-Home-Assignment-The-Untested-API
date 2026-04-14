const {
  validateCreateTask,
  validateUpdateTask,
  validateAssignTask,
  validateListQuery,
  VALID_STATUSES,
  VALID_PRIORITIES,
} = require('../src/utils/validators');

describe('validators', () => {
  test('exports supported statuses and priorities', () => {
    expect(VALID_STATUSES).toEqual(['todo', 'in_progress', 'done']);
    expect(VALID_PRIORITIES).toEqual(['low', 'medium', 'high']);
  });

  describe('validateCreateTask', () => {
    test('accepts a valid payload', () => {
      expect(
        validateCreateTask({
          title: 'Ship feature',
          description: 'Implement assign endpoint',
          status: 'todo',
          priority: 'high',
          dueDate: '2030-01-01T00:00:00.000Z',
        })
      ).toBeNull();
    });

    test('rejects missing or empty title', () => {
      expect(validateCreateTask({})).toBe('title is required and must be a non-empty string');
      expect(validateCreateTask({ title: '   ' })).toBe('title is required and must be a non-empty string');
    });

    test('rejects non-string description', () => {
      expect(validateCreateTask({ title: 'A', description: 123 })).toBe('description must be a string');
    });

    test('rejects invalid status and priority', () => {
      expect(validateCreateTask({ title: 'A', status: 'invalid' })).toBe(
        'status must be one of: todo, in_progress, done'
      );
      expect(validateCreateTask({ title: 'A', priority: 'urgent' })).toBe(
        'priority must be one of: low, medium, high'
      );
    });

    test('validates dueDate variants', () => {
      expect(validateCreateTask({ title: 'A', dueDate: null })).toBeNull();
      expect(validateCreateTask({ title: 'A', dueDate: {} })).toBe('dueDate must be a valid ISO date string');
      expect(validateCreateTask({ title: 'A', dueDate: 'invalid-date' })).toBe(
        'dueDate must be a valid ISO date string'
      );
    });
  });

  describe('validateUpdateTask', () => {
    test('rejects invalid body shapes', () => {
      expect(validateUpdateTask(null)).toBe('body must be an object');
      expect(validateUpdateTask([])).toBe('body must be an object');
      expect(validateUpdateTask({})).toBe('at least one field must be provided');
    });

    test('rejects invalid scalar fields', () => {
      expect(validateUpdateTask({ title: '' })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ description: 123 })).toBe('description must be a string');
      expect(validateUpdateTask({ status: 'x' })).toBe('status must be one of: todo, in_progress, done');
      expect(validateUpdateTask({ priority: 'x' })).toBe('priority must be one of: low, medium, high');
      expect(validateUpdateTask({ dueDate: 'bad-date' })).toBe('dueDate must be a valid ISO date string');
      expect(validateUpdateTask({ assignee: '' })).toBe('assignee must be a non-empty string when provided');
    });

    test('allows null assignee and valid updates', () => {
      expect(validateUpdateTask({ assignee: null })).toBeNull();
      expect(
        validateUpdateTask({
          title: 'Updated',
          description: 'Better details',
          status: 'in_progress',
          priority: 'medium',
          dueDate: null,
          assignee: 'Alice',
        })
      ).toBeNull();
    });
  });

  describe('validateAssignTask', () => {
    test('rejects invalid assignment payloads', () => {
      expect(validateAssignTask(null)).toBe('body must be an object');
      expect(validateAssignTask({ assignee: '   ' })).toBe('assignee is required and must be a non-empty string');
    });

    test('accepts valid assignment payload', () => {
      expect(validateAssignTask({ assignee: 'Alice' })).toBeNull();
    });
  });

  describe('validateListQuery', () => {
    test('rejects invalid query values', () => {
      expect(validateListQuery({ status: 'bad' })).toBe('status must be one of: todo, in_progress, done');
      expect(validateListQuery({ page: '0' })).toBe('page must be a positive integer');
      expect(validateListQuery({ page: '1.5' })).toBe('page must be a positive integer');
      expect(validateListQuery({ limit: '0' })).toBe('limit must be a positive integer');
      expect(validateListQuery({ limit: '101' })).toBe('limit must be less than or equal to 100');
    });

    test('accepts valid query values', () => {
      expect(validateListQuery({})).toBeNull();
      expect(validateListQuery({ status: 'todo', page: '1', limit: '100' })).toBeNull();
    });
  });
});
