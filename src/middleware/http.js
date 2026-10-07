import crypto from 'node:crypto';
import { notAcceptable, unsupportedMedia } from './errors.js';
import { logger } from '../shared/utils/logger.js';

export function requestContext(req, res, next) {
  const supplied = req.get('X-Request-Id');
  req.requestId = supplied && /^[A-Za-z0-9._:-]{1,100}$/.test(supplied) ? supplied : crypto.randomUUID();
  res.set('X-Request-Id', req.requestId);
  res.set('Vary', 'Authorization, Accept');
  res.set('Cache-Control', 'private, no-cache');
  const started = Date.now();
  res.on('finish', () => logger.info({ requestId: req.requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - started }, 'request completed'));
  next();
}

export function requireJsonAccept(req, res, next) {
  const accept = req.get('Accept');
  if (accept && accept !== '*/*' && !accept.split(',').some((part) => part.trim().toLowerCase().startsWith('application/json'))) {
    return next(notAcceptable());
  }
  return next();
}

export function requireJsonBody(req, res, next) {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) {
    return next(unsupportedMedia());
  }
  return next();
}
