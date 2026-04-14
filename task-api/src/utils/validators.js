const VALID_STATUSES = ['todo', 'in_progress', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const isValidOptionalIsoDate = (value) => {
  if (value === null) {
    return true;
  }

  if (typeof value !== 'string') {
    return false;
  }

  // Date.parse accepts ISO-8601 strings and rejects malformed date values.
  return !Number.isNaN(Date.parse(value));
};

const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;

const validateCreateTask = (body) => {
  // Create requires title and enforces optional field shapes when present.
  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    return 'title is required and must be a non-empty string';
  }
  if (hasOwn(body, 'description') && typeof body.description !== 'string') {
    return 'description must be a string';
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }
  if (hasOwn(body, 'dueDate') && !isValidOptionalIsoDate(body.dueDate)) {
    return 'dueDate must be a valid ISO date string';
  }
  return null;
};

const validateUpdateTask = (body) => {
  // Update rejects non-object payloads and no-op empty objects.
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'body must be an object';
  }
  if (Object.keys(body).length === 0) {
    return 'at least one field must be provided';
  }
  if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim() === '')) {
    return 'title must be a non-empty string';
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    return 'description must be a string';
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }
  if (hasOwn(body, 'dueDate') && !isValidOptionalIsoDate(body.dueDate)) {
    return 'dueDate must be a valid ISO date string';
  }
  if (
    body.assignee !== undefined &&
    body.assignee !== null &&
    (typeof body.assignee !== 'string' || body.assignee.trim() === '')
  ) {
    return 'assignee must be a non-empty string when provided';
  }

  return null;
};

const validateAssignTask = (body) => {
  // Assignment API intentionally allows only explicit non-empty assignee strings.
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'body must be an object';
  }
  if (typeof body.assignee !== 'string' || body.assignee.trim() === '') {
    return 'assignee is required and must be a non-empty string';
  }

  return null;
};

const validateListQuery = (query) => {
  // List validation keeps filtering/pagination semantics stable across endpoints.
  if (query.status !== undefined && !VALID_STATUSES.includes(query.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }

  if (query.page !== undefined) {
    const page = Number(query.page);
    if (!isPositiveInteger(page)) {
      return 'page must be a positive integer';
    }
  }

  if (query.limit !== undefined) {
    const limit = Number(query.limit);
    if (!isPositiveInteger(limit)) {
      return 'limit must be a positive integer';
    }
    // Bound limit to avoid accidental oversized in-memory responses.
    if (limit > 100) {
      return 'limit must be less than or equal to 100';
    }
  }

  return null;
};

module.exports = {
  VALID_STATUSES,
  VALID_PRIORITIES,
  validateCreateTask,
  validateUpdateTask,
  validateAssignTask,
  validateListQuery,
};
