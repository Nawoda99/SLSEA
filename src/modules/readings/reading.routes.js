import rateLimit from 'express-rate-limit';
import { authenticate } from '../auth/auth.middleware.js';
import { requireDevice, requireUser } from '../../shared/security/authorization.js';
import { readingController } from './reading.controller.js';

const ingestionLimiter = rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false, handler: (req, res) => res.status(429).json({ error: { code: 'rate_limit_exceeded', message: 'Too many ingestion requests; retry later' }, requestId: req.requestId }) });

export function registerRoutes(router) {
  router.get('/installations/:installationId/readings', authenticate, requireUser, readingController.listForInstallation);
  router.get('/installations/:installationId/readings/:readingId', authenticate, requireUser, readingController.get);
  router.post('/installations/:installationId/readings', authenticate, requireDevice, ingestionLimiter, readingController.ingest);
  router.put('/installations/:installationId/readings/:readingId', authenticate, readingController.mutation);
  router.patch('/installations/:installationId/readings/:readingId', authenticate, readingController.mutation);
  router.delete('/installations/:installationId/readings/:readingId', authenticate, readingController.mutation);
  router.get('/readings', authenticate, requireUser, readingController.list);
}
