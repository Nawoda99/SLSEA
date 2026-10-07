import { authenticate } from '../auth/auth.middleware.js';
import { requireUser } from '../../shared/security/authorization.js';
import { summaryController } from './summary.controller.js';

export function registerRoutes(router) {
  router.get('/districts/:districtId/generation-summary', authenticate, requireUser, summaryController.districtGeneration);
}
