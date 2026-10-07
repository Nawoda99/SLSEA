import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/config.js';
import { sequelize } from './database/connection.js';
import './database/models/index.js';
import { router } from './modules/api.routes.js';
import { openapi } from './openapi.js';
import { requestContext, requireJsonAccept, requireJsonBody } from './middleware/http.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';

export function createApp() {
  const app = express();
  app.locals.config = config;
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(requestContext);
  app.use(helmet());
  app.use(cors({ origin: (origin, callback) => {
    const sameOrigin = [`http://localhost:${config.port}`, `http://127.0.0.1:${config.port}`].includes(origin);
    if (!origin || sameOrigin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  }, credentials: false }));
  app.use(express.json({ limit: '32kb', strict: true }));
  app.get('/health', (req, res) => res.status(200).json({ status: 'ok', service: 'slsea-solar-generation-api' }));
  app.get('/ready', async (req, res) => {
    try { await sequelize.authenticate(); return res.status(200).json({ status: 'ready', database: 'ok' }); }
    catch { return res.status(503).json({ status: 'not_ready', database: 'unavailable', requestId: req.requestId }); }
  });
  app.get('/openapi.json', (req, res) => res.json(openapi));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi, { explorer: true }));
  app.use('/api/v1', requireJsonAccept, requireJsonBody, router);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export const app = createApp();
