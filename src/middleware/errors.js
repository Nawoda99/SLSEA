import { UniqueConstraintError, ValidationError as SequelizeValidationError } from 'sequelize';
import { logger } from '../utils/logger.js';

export class ApiError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, details) => new ApiError(400, 'invalid_request', message, details);
export const unauthorized = (message = 'Authentication is required') => new ApiError(401, 'authentication_required', message);
export const forbidden = (message = 'You are not authorised to perform this action') => new ApiError(403, 'forbidden', message);
export const notFound = (message = 'Resource not found') => new ApiError(404, 'not_found', message);
export const methodNotAllowed = (allow) => {
  const error = new ApiError(405, 'method_not_allowed', 'The HTTP method is not allowed for this resource');
  error.allow = allow;
  return error;
};
export const notAcceptable = (message = 'Only JSON representations are supported') => new ApiError(406, 'not_acceptable', message);
export const unsupportedMedia = () => new ApiError(415, 'unsupported_media_type', 'Request bodies must use application/json');
export const conflict = (message, details) => new ApiError(409, 'conflict', message, details);
export const preconditionFailed = (message, details) => new ApiError(412, 'precondition_failed', message, details);

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  let apiError = error;
  if (error instanceof UniqueConstraintError) {
    apiError = conflict('A resource with the same unique identifier already exists');
  } else if (error instanceof SequelizeValidationError) {
    apiError = badRequest('The supplied data is invalid', error.errors.map((item) => item.path));
  } else if (error?.type === 'entity.too.large') {
    apiError = new ApiError(413, 'payload_too_large', 'The request body is too large');
  } else if (error instanceof SyntaxError && error.status === 400 && Object.hasOwn(error, 'body')) {
    apiError = badRequest('Malformed JSON request body');
  }

  const status = Number.isInteger(apiError.status) ? apiError.status : 500;
  const requestId = req.requestId ?? 'unknown';
  if (status === 401) res.set('WWW-Authenticate', 'Bearer realm="slsea-api"');
  if (status >= 500) logger.error({ err: error, requestId }, 'request failed');
  else logger.info({ status, code: apiError.code, requestId }, 'request rejected');

  if (apiError.allow) res.set('Allow', apiError.allow.join(', '));
  return res.status(status).json({
    error: {
      code: apiError.code ?? 'internal_error',
      message: status >= 500 ? 'An unexpected server error occurred' : apiError.message,
      ...(apiError.details === undefined ? {} : { details: apiError.details })
    },
    requestId
  });
}

export function notFoundHandler(req, res, next) {
  next(notFound('The requested resource does not exist'));
}
