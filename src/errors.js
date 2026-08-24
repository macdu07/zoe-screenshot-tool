export class AppError extends Error {
  constructor(message, { status = 500, code = 'INTERNAL_ERROR', cause } = {}) {
    super(message, { cause });
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  constructor(message, code = 'INVALID_REQUEST') {
    super(message, { status: 400, code });
  }
}

export class ForbiddenTargetError extends AppError {
  constructor(message = 'Target URL is not allowed') {
    super(message, { status: 403, code: 'FORBIDDEN_TARGET' });
  }
}

export class QueueFullError extends AppError {
  constructor() {
    super('Capture queue is full. Please try again later.', { status: 503, code: 'QUEUE_FULL' });
  }
}

export class UpstreamError extends AppError {
  constructor(message, { timeout = false, cause } = {}) {
    super(message, { status: timeout ? 504 : 502, code: timeout ? 'NAVIGATION_TIMEOUT' : 'UPSTREAM_ERROR', cause });
  }
}

export class ResourceLimitError extends AppError {
  constructor(message) {
    super(message, { status: 413, code: 'RESOURCE_LIMIT' });
  }
}
