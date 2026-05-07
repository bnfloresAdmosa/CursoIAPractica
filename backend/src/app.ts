import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import { env } from './lib/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/router.js';
import { projectsRouter } from './modules/projects/router.js';
import { projectTicketsRouter, ticketsRouter } from './modules/tickets/router.js';
import { generateOpenApiDocument } from './openapi/document.js';

export function createApp() {
  const app = express();

  // CSP off — swagger-ui-express necesita inline scripts/styles. En prod, configurar CSP fina.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger }));

  // Health endpoint (no requiere auth)
  app.get('/api/v1/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'minijira-api',
      env: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  // Routers (orden importa: el side-effect de importarlos popula el OpenAPI registry)
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/projects', projectsRouter);
  app.use('/api/v1/projects/:projectId/tickets', projectTicketsRouter);
  app.use('/api/v1/tickets', ticketsRouter);

  // OpenAPI document — generado UNA vez al arranque tras registrar todas las rutas.
  const openapiDocument = generateOpenApiDocument();

  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));
  app.get('/api/v1/openapi.yaml', (_req, res) => {
    res.type('text/yaml').send(YAML.stringify(openapiDocument));
  });
  app.get('/api/v1/openapi.json', (_req, res) => {
    res.json(openapiDocument);
  });

  // 404 fallback
  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: 'Ruta no encontrada' } });
  });

  // Error handler — siempre al final.
  app.use(errorHandler);

  return app;
}
