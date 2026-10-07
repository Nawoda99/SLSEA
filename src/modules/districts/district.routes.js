import { authenticate } from '../auth/auth.middleware.js';
import { requireMaintenance, requireUser } from '../../shared/security/authorization.js';
import { districtController } from './district.controller.js';

export function registerRoutes(router) {
  router.get('/districts', authenticate, requireUser, districtController.list);
  router.get('/districts/:districtId', authenticate, requireUser, districtController.get);
  router.get('/districts/:districtId/grid-substations', authenticate, requireUser, districtController.listSubstations);
  router.post('/districts', authenticate, requireMaintenance, districtController.create);
  router.put('/districts/:districtId', authenticate, requireMaintenance, districtController.replace);
  router.patch('/districts/:districtId', authenticate, requireMaintenance, districtController.patch);
  router.delete('/districts/:districtId', authenticate, requireMaintenance, districtController.remove);
  router.all('/districts/:districtId', districtController.methods);
}
