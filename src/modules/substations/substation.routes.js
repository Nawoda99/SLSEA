import { authenticate } from '../auth/auth.middleware.js';
import { requireMaintenance, requireUser } from '../../shared/security/authorization.js';
import { substationController } from './substation.controller.js';

export function registerRoutes(router) {
  router.get('/grid-substations', authenticate, requireUser, substationController.list);
  router.get('/grid-substations/:substationId', authenticate, requireUser, substationController.get);
  router.get('/grid-substations/:substationId/installations', authenticate, requireUser, substationController.listInstallations);
  router.post('/grid-substations', authenticate, requireMaintenance, substationController.create);
  router.put('/grid-substations/:substationId', authenticate, requireMaintenance, substationController.replace);
  router.patch('/grid-substations/:substationId', authenticate, requireMaintenance, substationController.patch);
  router.delete('/grid-substations/:substationId', authenticate, requireMaintenance, substationController.remove);
  router.all('/grid-substations/:substationId', substationController.methods);
}
