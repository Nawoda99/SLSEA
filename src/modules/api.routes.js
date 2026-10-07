import { Router } from 'express';
import { registerRoutes as registerAuthRoutes } from './auth/auth.routes.js';
import { registerRoutes as registerProvinceRoutes } from './provinces/province.routes.js';
import { registerRoutes as registerDistrictRoutes } from './districts/district.routes.js';
import { registerRoutes as registerSubstationRoutes } from './substations/substation.routes.js';
import { registerRoutes as registerInstallationRoutes } from './installations/installation.routes.js';
import { registerRoutes as registerReadingRoutes } from './readings/reading.routes.js';
import { registerRoutes as registerSummaryRoutes } from './summaries/summary.routes.js';

export const router = Router();

registerAuthRoutes(router);
registerProvinceRoutes(router);
registerDistrictRoutes(router);
registerSubstationRoutes(router);
registerInstallationRoutes(router);
registerReadingRoutes(router);
registerSummaryRoutes(router);
