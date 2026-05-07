import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import YAML from 'yaml';
import { logger } from '../lib/logger.js';
import { registry } from './registry.js';

export function generateOpenApiDocument(): Record<string, unknown> {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Mini Jira API',
      version: '1.0.0',
      description:
        'API de Mini Jira. Spec canónica en `api-contract.md` (raíz del repo). Envelope: REST plano en éxito, `{error: {code, message, details?}}` en errores.',
    },
    servers: [{ url: '/api/v1', description: 'Base path' }],
    tags: [
      { name: 'auth', description: 'Login / refresh / logout' },
      { name: 'projects', description: 'CRUD de proyectos' },
      { name: 'tickets', description: 'CRUD de tickets' },
    ],
  }) as unknown as Record<string, unknown>;
}

export function writeOpenApiYaml(): string {
  const doc = generateOpenApiDocument();
  const out = resolve(process.cwd(), 'openapi.yaml');
  writeFileSync(out, YAML.stringify(doc), 'utf8');
  logger.info({ path: out }, 'openapi.yaml written');
  return out;
}
