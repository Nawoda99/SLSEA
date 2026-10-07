import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../middleware/errors.js';
import { loginInstallation, loginUser } from './auth.controller.js';

const authLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false, handler: (req, res) => res.status(429).json({ error: { code: 'rate_limit_exceeded', message: 'Too many authentication attempts; retry later' }, requestId: req.requestId }) });

export function registerRoutes(router) {
  router.post('/auth/users/login', authLimiter, asyncHandler(loginUser));
  router.post('/auth/installations/token', authLimiter, asyncHandler(loginInstallation));
}
