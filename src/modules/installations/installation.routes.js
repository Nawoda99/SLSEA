import { authenticate } from '../auth/auth.middleware.js';
import { requireMaintenance, requireUser } from '../../shared/security/authorization.js';
import { installationController } from './installation.controller.js';

export function registerRoutes(router) {
  router.get('/installations', authenticate, requireUser, installationController.list);
  router.get('/installations/:installationId', authenticate, requireUser, installationController.get);
  router.get('/installations/:installationId/overview', authenticate, requireUser, installationController.overview);
  router.get('/installations/:installationId/last-known-reading', authenticate, requireUser, installationController.lastKnownReading);
  router.post('/installations', authenticate, requireMaintenance, installationController.create);
  router.put('/installations/:installationId', authenticate, requireMaintenance, installationController.replace);
  router.patch('/installations/:installationId', authenticate, requireMaintenance, installationController.patch);
  router.delete('/installations/:installationId', authenticate, requireMaintenance, installationController.remove);
  router.all('/installations/:installationId', installationController.methods);
}
