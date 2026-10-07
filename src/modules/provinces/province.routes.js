import { authenticate } from '../auth/auth.middleware.js';
import { requireMaintenance, requireUser } from '../../shared/security/authorization.js';
import { provinceController } from './province.controller.js';

export function registerRoutes(router) {
  router.get('/provinces', authenticate, requireUser, provinceController.list);
  router.get('/provinces/:provinceId', authenticate, requireUser, provinceController.get);
  router.get('/provinces/:provinceId/districts', authenticate, requireUser, provinceController.listDistricts);
  router.post('/provinces', authenticate, requireMaintenance, provinceController.create);
  router.put('/provinces/:provinceId', authenticate, requireMaintenance, provinceController.replace);
  router.patch('/provinces/:provinceId', authenticate, requireMaintenance, provinceController.patch);
  router.delete('/provinces/:provinceId', authenticate, requireMaintenance, provinceController.remove);
  router.all('/provinces/:provinceId', provinceController.methods);
}
