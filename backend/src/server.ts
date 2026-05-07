import { createApp } from './app.js';
import { env } from './lib/env.js';
import { logger } from './lib/logger.js';
import { writeOpenApiYaml } from './openapi/document.js';

const app = createApp();

// Persistir openapi.yaml en raíz del backend para CI / clientes externos.
try {
  writeOpenApiYaml();
} catch (err) {
  logger.error({ err }, 'failed to write openapi.yaml — continuando sin persistir');
}

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'minijira-api listening');
});

const shutdown = (signal: string) => {
  logger.info({ signal }, 'shutting down');
  server.close(() => process.exit(0));
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
