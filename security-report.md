# Reporte de Seguridad — Mini Jira API

**Fecha:** 2026-05-07
**Auditor:** Especialista en Seguridad (OWASP)
**Alcance:** `backend/src/**` + `frontend/src/lib/api.ts` + variables de entorno
**Marco:** OWASP Top 10:2021

> Solo audita y reporta. Las correcciones se aplican siguiendo `correction-prompt.md`.

---

## Resumen ejecutivo

| Severidad | Hallazgos |
|---|---|
| **CRÍTICO** | 2 |
| **ALTO** | 3 |
| **MEDIO** | 5 |
| **BAJO** | 4 |

Bloqueadores antes de producción: **CRÍTICO + ALTO** (5 hallazgos).

---

## 🔴 CRÍTICO

### CRIT-01 — Credenciales demo hardcodeadas en código de cliente
**OWASP:** A02:2021 Cryptographic Failures · A07:2021 Identification and Authentication Failures
**Archivo:** `frontend/src/lib/api.ts`
**Evidencia:**
```ts
const DEMO_CREDS = { email: 'laura@empresa.com', password: 'demo123' };
// ...
const result = await rawLogin(DEMO_CREDS.email, DEMO_CREDS.password);
```
**Impacto:** Las credenciales viajan en el bundle de JavaScript que el navegador descarga. Cualquier visitante de la app puede leerlas con DevTools → Sources, sin necesidad de autenticarse. Cualquier deploy a un dominio público compromete la cuenta de Laura instantáneamente. El password `demo123` es además trivial.

### CRIT-02 — JWT secrets predecibles en `.env.example`
**OWASP:** A02:2021 Cryptographic Failures · A05:2021 Security Misconfiguration
**Archivo:** `.env.example`
**Evidencia:**
```
JWT_ACCESS_SECRET=change-me-in-prod-please-use-32-bytes-min
JWT_REFRESH_SECRET=change-me-too-and-rotate-on-compromise
```
**Impacto:** Si un developer copia `.env.example` a `.env` sin rotar, el secreto del firmado JWT es público (está en git). Atacante puede forjar access tokens válidos con cualquier `sub`/`roles` y usurpar usuarios — incluyendo Admin. La validación Zod en `lib/env.ts` solo exige longitud mínima 16, no aleatoriedad.

---

## 🟠 ALTO

### ALTO-01 — Sin rate limiting en `POST /auth/login`
**OWASP:** A04:2021 Insecure Design · A07:2021 Identification and Authentication Failures
**Archivo:** `backend/src/modules/auth/router.ts`
**Evidencia:** El handler `authRouter.post('/login', ...)` no aplica ningún limitador. `bcrypt.compare` toma ~100ms con cost 12, pero un atacante con 100 conexiones paralelas hace 600 intentos/min — trivial para diccionarios cortos.
**Impacto:** Brute force directo al endpoint. El mensaje genérico `invalid_credentials` (HU-01 borde) no protege contra ataques con listas filtradas de emails reales.

### ALTO-02 — CSP deshabilitado globalmente
**OWASP:** A05:2021 Security Misconfiguration
**Archivo:** `backend/src/app.ts`
**Evidencia:**
```ts
app.use(helmet({ contentSecurityPolicy: false }));
```
**Impacto:** El CSP estaba bloqueando scripts inline de Swagger UI, así que se apagó globalmente. En producción esto deja abierto el vector más común de XSS amplification: cualquier script inyectado puede exfiltrar tokens (que están en `localStorage`, ver MEDIO-04). El comentario en el código lo reconoce pero no se enmienda.

### ALTO-03 — Tokens en `localStorage` susceptibles a XSS
**OWASP:** A07:2021 Identification and Authentication Failures
**Archivo:** `frontend/src/lib/api.ts`
**Evidencia:**
```ts
localStorage.setItem(ACCESS_KEY, result.accessToken);
localStorage.setItem(REFRESH_KEY, result.refreshToken);
```
**Impacto:** Combinado con ALTO-02 (CSP off) y CRIT-01 (creds expuestas), una sola XSS vulnera todas las sesiones del usuario. Best practice: refresh token en cookie `httpOnly`, access token en memoria.

---

## 🟡 MEDIO

### MED-01 — JWT sin claims `iss` ni `aud`
**OWASP:** A02:2021 Cryptographic Failures
**Archivo:** `backend/src/lib/jwt.ts`
**Evidencia:** `signAccessToken` y `signRefreshToken` solo emiten `sub`, `email`, `roles`. Sin `iss` (issuer) ni `aud` (audience).
**Impacto:** Si en el futuro otro servicio comparte el mismo `JWT_ACCESS_SECRET` (por error de copy-paste en multi-app), un token de Mini Jira sería válido en el otro servicio. Sin `aud` no se puede limitar el alcance del token.

### MED-02 — Inmutabilidad de `audit_log` solo a nivel app
**OWASP:** A09:2021 Security Logging and Monitoring Failures
**Archivo:** `backend/src/modules/tickets/service.ts` (`changeTicketStatus`)
**Evidencia:** El servicio nunca emite UPDATE/DELETE sobre `audit_log` (correcto). Pero el rol de aplicación en BD es `sa` con permisos totales, así que un atacante con SQL injection o acceso al backend podría reescribir el audit_log silenciosamente.
**Impacto:** El histórico que alimenta el dashboard de métricas (HU-14) se puede falsificar. `database-schema.yaml` § audit_log lo exige a nivel BD para producción (`DENY UPDATE/DELETE TO app_user`) pero no se ha aplicado.

### MED-03 — Refresh tokens sin job de limpieza
**OWASP:** A09:2021 (logging/monitoring deficiente para detectar abuso)
**Archivo:** `backend/src/modules/auth/service.ts`
**Evidencia:** `refreshToken.create` se llama en cada login y refresh. No existe job que haga `DELETE FROM refresh_token WHERE expires_at < NOW() - 30d` (sí está documentado en `database-schema.yaml` `cleanup_jobs` pero no implementado).
**Impacto:** La tabla crece indefinidamente. Sobrecarga de I/O en queries de auth con el tiempo. Tokens revocados/consumidos antiguos se acumulan.

### MED-04 — Sin política de longitud/complejidad de contraseña
**OWASP:** A07:2021 Identification and Authentication Failures
**Archivo:** `backend/src/modules/auth/schemas.ts`
**Evidencia:**
```ts
password: z.string().min(1).openapi({ example: 'password123' }),
```
Solo `min(1)` — aceptamos contraseñas de 1 char. No hay endpoint público de registro, pero el helper `registerUser` y el seed permiten crear usuarios con `demo123`.
**Impacto:** Si se expone un endpoint de registro a futuro, sería trivial registrar passwords débiles. La política mínima recomendada: 8+ chars, complejidad opcional, longitud máxima razonable (72 para bcrypt).

### MED-05 — `errorHandler` expone `res.statusText` para errores genéricos
**OWASP:** A09:2021 Security Logging and Monitoring Failures (info leak)
**Archivo:** `backend/src/middleware/errorHandler.ts`
**Evidencia:** Para errores que no son `ZodError` ni `ApiError`, retorna 500 con `{code:'internal_error', message:'Error interno del servidor'}` (correcto). Pero el pino logger imprime el stack en consola — si los logs salen a un destino accesible por usuarios (ej: Grafana sin auth), revelan estructura interna.
**Impacto:** Bajo en sí, pero combinado con malos logs (pino-pretty en prod) puede filtrar paths internos, queries Prisma con datos sensibles, etc.

---

## 🔵 BAJO

### BAJO-01 — CORS restringido a un único origen sin pattern matching
**Archivo:** `backend/src/app.ts` + `lib/env.ts` (`CORS_ORIGIN: z.string().url()`)
**Impacto:** Si el frontend se despliega en `staging.minijira.com` y `prod.minijira.com`, hay que restartear el server por cada origen. Migrar a array o regex en producción.

### BAJO-02 — `BCRYPT_COST` configurable por env con piso 10
**Archivo:** `backend/src/lib/env.ts`
**Evidencia:** `BCRYPT_COST: z.coerce.number().int().min(10).max(15).default(12)`. El piso 10 es aceptable pero ligeramente bajo para 2026 (recomendación moderna: 12+).
**Impacto:** Si un atacante obtiene un dump de password_hash, cost 10 reduce el tiempo de cracking ~4x vs cost 12.

### BAJO-03 — Cast de tipo en `verifyAccessToken`
**Archivo:** `backend/src/lib/jwt.ts`
**Evidencia:** `return jwt.verify(token, env.JWT_ACCESS_SECRET) as unknown as AccessTokenPayload;` — el doble cast bypasea la validación de TypeScript del payload. Si el secret se compromete y un atacante firma un payload de forma inesperada, el código asume la forma sin validarla.
**Impacto:** Defensa en profundidad ausente. Bajo porque ya verificamos `req.user` antes de usar campos críticos.

### BAJO-04 — Frontend exhibe tokens en logs si pino sale a consola
**Archivo:** `frontend/src/lib/api.ts`
**Evidencia:** El response de `/auth/login` incluye los tokens completos. Si el dev tiene pino-pretty + `log: ['query']` activos, los logs podrían capturar headers o bodies con tokens.
**Impacto:** Bajo — depende de configuración local del dev.

---

## Priorización para correction-prompt.md

| Orden | Hallazgo | Riesgo si no se aplica antes de prod |
|---|---|---|
| 1 | CRIT-01 (creds hardcodeadas) | Cuenta admin pública en cualquier deploy |
| 2 | CRIT-02 (JWT secrets predecibles) | Cualquier atacante forja tokens admin |
| 3 | ALTO-01 (sin rate limit login) | Brute force trivial |
| 4 | ALTO-02 (CSP off) | XSS amplification |
| 5 | ALTO-03 (tokens en localStorage) | Robo de sesión vía XSS |
| 6 | MED-01 (JWT sin iss/aud) | Token reuse cross-service |
| 7 | MED-02 (audit_log mutable en app role) | Falsificación de histórico |
| 8 | MED-03 (sin cleanup de refresh tokens) | I/O degradación lenta |
| 9 | MED-04 (sin política de password) | Passwords débiles si se abre signup |
| 10 | MED-05 (logs verbose en error genérico) | Info leak vía logs |
| 11 | BAJO-01..04 | Quality-of-life / defense in depth |

---

**Nota final:** la auditoría asume que `database-schema.yaml`, `api-contract.md` y `CLAUDE.md` se mantienen como spec canónica. Cualquier corrección debe respetarlos o actualizarlos primero.
