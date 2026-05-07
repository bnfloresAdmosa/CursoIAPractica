# Correction Prompt — Mini Jira (post-auditoría OWASP)

**Para:** Agente "Ingeniero Senior de Seguridad" en una sesión limpia.
**Input:** este archivo + `security-report.md` + acceso de escritura al repo.

---

## Instrucciones

Lee `security-report.md`. Aplica las correcciones en el orden de severidad estricto: **CRÍTICO → ALTO → MEDIO → BAJO**. No saltes orden — un fix de CRÍTICO puede invalidar uno de MEDIO si los aplicas al revés.

Antes de cada bloque de severidad, escribe en el PR description **qué hallazgos cubre** y **qué archivos se tocan**. Después de cada bloque, corre `pnpm test` y `pnpm exec tsc -b --noEmit` antes de pasar al siguiente.

**No introduzcas regresiones**: si una corrección rompe un test, ajusta el test (los criterios del backlog mandan, no los assertions previos).

**Mantén el envelope** decidido en `api-contract.md` §1.1 (REST plano + `{error: {code, message, details?}}`). Mantén el contrato de endpoints — si necesitas modificarlo, edita primero `api-contract.md` y `openapi.yaml`.

---

## Bloque 1 — CRÍTICO

### CRIT-01 — Quitar credenciales demo del cliente

**Archivo:** `frontend/src/lib/api.ts`

1. Elimina la constante `DEMO_CREDS` y la función `ensureToken()` que hace auto-login implícito.
2. Refactoriza el flujo:
   - El `apiFetch` deja de llamar `ensureToken()`. Si no hay token en `localStorage`, lanza `ApiError(401, 'Auth requerido', 'unauthorized')` sin intentar login.
   - Expón `api.auth.login(email, password)` como única vía de obtener tokens.
3. Crea una pantalla mínima `frontend/src/features/auth/LoginScreen.tsx` con:
   - Inputs email + password (`react-hook-form` opcional, no obligatorio).
   - Submit llama `api.auth.login`, almacena tokens, redirige.
4. Modifica `App.tsx`: ruta `/login`. Cualquier ruta protegida que reciba 401 redirige a `/login`.
5. En el caso de demo/dev, si quieres precargar credenciales de prueba, usa `import.meta.env.VITE_DEMO_EMAIL` / `VITE_DEMO_PASSWORD` desde **archivos `.env.local`** que NO se commitean. Documenta en `frontend/.env.example` con valores vacíos.

### CRIT-02 — Rotar secretos JWT y validar entropía

**Archivos:** `.env.example`, `backend/.env`, `backend/src/lib/env.ts`

1. En `.env.example`, reemplaza los valores predecibles con instrucción clara y placeholder seguro:
   ```
   # Genera con: node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
   JWT_ACCESS_SECRET=
   JWT_REFRESH_SECRET=
   ```
2. En `backend/src/lib/env.ts`, refuerza la validación:
   ```ts
   JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET debe tener al menos 32 chars (usa randomBytes(48).toString(\'hex\'))'),
   JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 chars'),
   ```
3. En `backend/.env`, reemplaza con valores generados aleatoriamente (NUNCA versionados).
4. Documenta en `CLAUDE.md` §7 que los secretos NO se commitean y se rotan con cada incidente.

---

## Bloque 2 — ALTO

### ALTO-01 — Rate limiting en `POST /auth/login`

**Archivo nuevo:** `backend/src/middleware/rateLimit.ts`

1. Instala `express-rate-limit`: `pnpm add express-rate-limit`.
2. Crea middleware:
   ```ts
   import rateLimit from 'express-rate-limit';
   export const loginLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 min
     max: 5, // 5 intentos por IP por ventana
     message: { error: { code: 'too_many_requests', message: 'Demasiados intentos, intenta más tarde' } },
     standardHeaders: true,
     legacyHeaders: false,
   });
   ```
3. En `backend/src/modules/auth/router.ts`, aplica al endpoint:
   ```ts
   authRouter.post('/login', loginLimiter, asyncHandler(...));
   ```
4. Considera también `loginLimiter` en `/auth/refresh` (límite más laxo: 30 por 15 min).
5. Para producción, configurar trust proxy: `app.set('trust proxy', 1);` en `app.ts` para que el limiter use la IP real detrás de balanceador.

### ALTO-02 — Configurar CSP correctamente

**Archivo:** `backend/src/app.ts`

1. Reemplaza `helmet({ contentSecurityPolicy: false })` con configuración explícita:
   ```ts
   app.use(
     helmet({
       contentSecurityPolicy: {
         directives: {
           defaultSrc: ["'self'"],
           scriptSrc: ["'self'", "'unsafe-inline'"], // Swagger UI necesita inline
           styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
           fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
           imgSrc: ["'self'", "data:", "https://validator.swagger.io"],
           connectSrc: ["'self'"],
           objectSrc: ["'none'"],
         },
       },
     }),
   );
   ```
2. Si Swagger UI rompe con `unsafe-inline`, alternativa: serve Swagger en una ruta protegida solo en desarrollo (`if (env.NODE_ENV === 'development')`).
3. Verifica con curl que las response headers incluyen `Content-Security-Policy: default-src 'self'; ...`.

### ALTO-03 — Migrar refresh token a cookie httpOnly

**Archivos:** `backend/src/modules/auth/router.ts`, `backend/src/modules/auth/service.ts`, `frontend/src/lib/api.ts`

1. Backend: en `/auth/login` y `/auth/refresh`, NO retornes `refreshToken` en el body. En su lugar:
   ```ts
   res.cookie('mj_refresh', refreshToken, {
     httpOnly: true,
     secure: env.NODE_ENV === 'production',
     sameSite: 'strict',
     maxAge: 7 * 24 * 60 * 60 * 1000,
     path: '/api/v1/auth',
   });
   ```
2. En `/auth/refresh`, lee el cookie en lugar del body:
   ```ts
   const refreshToken = req.cookies?.mj_refresh;
   if (!refreshToken) throw new ApiError(401, 'Sin refresh token', 'unauthorized');
   ```
3. En `/auth/logout`, limpia el cookie: `res.clearCookie('mj_refresh', { path: '/api/v1/auth' });`.
4. Instala `cookie-parser`: `pnpm add cookie-parser` y `pnpm add -D @types/cookie-parser`. Móntalo en `app.ts`: `app.use(cookieParser());`.
5. Frontend: en `api.ts`, deja de almacenar `refreshToken` en `localStorage`. Solo el `accessToken` (en memoria, no `localStorage`).
6. CORS: ajusta `cors({ origin: env.CORS_ORIGIN, credentials: true })` (ya está). Asegura que `fetch` envíe credenciales: `fetch(url, { credentials: 'include' })`.
7. Actualiza `api-contract.md` §2.1: indica que `/auth/refresh` no recibe body, lee del cookie.

---

## Bloque 3 — MEDIO

### MED-01 — JWT con `iss` y `aud`

**Archivo:** `backend/src/lib/jwt.ts`

```ts
const ISS = 'minijira-api';
const AUD = 'minijira-web';

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
    issuer: ISS,
    audience: AUD,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: ISS,
    audience: AUD,
  }) as unknown as AccessTokenPayload;
}
```

Mismo patrón para refresh tokens (`AUD = 'minijira-refresh'`).

### MED-02 — DENY UPDATE/DELETE en `audit_log` para usuario de app

**Archivo:** nueva migración manual

1. Crear migración: `pnpm prisma migrate dev --create-only --name lock_audit_log`.
2. Editar el `migration.sql` generado:
   ```sql
   -- Crear usuario de aplicación (en producción, no en dev con sa)
   IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'minijira_app')
   BEGIN
     CREATE USER minijira_app WITHOUT LOGIN;
     GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO minijira_app;
     DENY UPDATE ON OBJECT::dbo.audit_log TO minijira_app;
     DENY DELETE ON OBJECT::dbo.audit_log TO minijira_app;
   END
   ```
3. En staging+, configurar `DATABASE_URL` con `user=minijira_app` (no `sa`).
4. Documentar en `database-schema.yaml` `deployment_notes.app_user_grants` que esto se aplica.

### MED-03 — Job de cleanup de refresh tokens

**Archivo nuevo:** `backend/src/modules/auth/cleanup.ts`

```ts
import { prisma } from '../../db/prisma.js';
import { logger } from '../../lib/logger.js';

export async function cleanupExpiredRefreshTokens(): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: cutoff } },
  });
  logger.info({ deleted: result.count }, 'refresh_token cleanup');
  return result.count;
}
```

En `server.ts`, schedula cada 24h:
```ts
import { cleanupExpiredRefreshTokens } from './modules/auth/cleanup.js';
setInterval(() => { cleanupExpiredRefreshTokens().catch(() => {}); }, 24 * 60 * 60 * 1000);
cleanupExpiredRefreshTokens().catch(() => {}); // arranque
```

### MED-04 — Política de password

**Archivo:** `backend/src/modules/auth/schemas.ts`

Cuando se cree el endpoint `POST /auth/register` (no existe aún en MVP):
```ts
export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .max(72, 'Máximo 72 caracteres (límite bcrypt)')
    .regex(/[A-Z]/, 'Al menos una mayúscula')
    .regex(/[0-9]/, 'Al menos un número'),
  name: z.string().min(1).max(255),
});
```

Para login NO restrinjas la complejidad — solo valida formato del email y que password no esté vacío. La política aplica al alta.

### MED-05 — Sanitizar logs

**Archivo:** `backend/src/lib/logger.ts`

Configura pino redact:
```ts
export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.refreshToken',
      'res.headers["set-cookie"]',
    ],
    censor: '[REDACTED]',
  },
  ...
});
```

---

## Bloque 4 — BAJO

### BAJO-01 — CORS multi-origin

`backend/src/lib/env.ts`: `CORS_ORIGIN: z.string()` (sin `.url()`), permite lista separada por coma. En `app.ts`:
```ts
const origins = env.CORS_ORIGIN.split(',').map(s => s.trim());
app.use(cors({ origin: origins, credentials: true }));
```

### BAJO-02 — Subir piso BCRYPT_COST a 12

`lib/env.ts`: `BCRYPT_COST: z.coerce.number().int().min(12).max(15).default(12)`.

### BAJO-03 — Validar payload de JWT con Zod

`lib/jwt.ts`:
```ts
const AccessTokenPayloadSchema = z.object({
  sub: z.number().int(),
  email: z.string().email(),
  roles: z.record(z.string(), z.enum(['ADMIN', 'USER'])),
});

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: ISS, audience: AUD });
  return AccessTokenPayloadSchema.parse(decoded);
}
```

Si la validación falla, el `jwt.verify` ya lanzó o el `parse` lanza ZodError → middleware lo convierte en 401 unauthorized.

### BAJO-04 — Pino redact ya cubre tokens

Ya cubierto en MED-05.

---

## Verificación final

Después de aplicar todos los bloques:

1. `pnpm exec tsc -b --noEmit` — sin errores TS.
2. `pnpm test` — todos los tests pasan; ajusta los que rompan por refactor de auth.
3. Manual smoke test:
   - Login con creds válidas → 200, recibe cookie `mj_refresh` httpOnly.
   - Login con email inexistente → 401 `invalid_credentials` (mensaje genérico).
   - 6 logins fallidos seguidos → 6º responde 429 `too_many_requests`.
   - Inspect DevTools → Application → Cookies: `mj_refresh` con flags `HttpOnly` y `Secure` (en prod).
   - `localStorage.getItem('mj.refresh')` desde la consola → `null`.
   - `curl -I http://localhost:3030/api/v1/health` → header `Content-Security-Policy: default-src 'self'`.
4. Re-correr `auditor` agent para confirmar que los hallazgos CRÍTICO/ALTO bajaron a 0.

---

**Out of scope (siguiente sprint):** rotación periódica de secretos, MFA, audit log alertas en tiempo real, revisión de dependencias con `npm audit` / `snyk`.
