// Vitest setup — define las env vars antes de que cualquier módulo importe lib/env.ts.
// Las pruebas NUNCA tocan la BD real: prisma se mockea por archivo de test.

process.env.NODE_ENV = 'test';
process.env.PORT = '3030';
process.env.DATABASE_URL =
  'sqlserver://localhost:1433;database=test;user=sa;password=Test_1234_test;encrypt=true;trustServerCertificate=true';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-16-chars-do-not-use-in-prod';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-16-chars-do-not-use-in-prod';
process.env.JWT_ACCESS_TTL = '1h';
process.env.JWT_REFRESH_TTL = '7d';
process.env.BCRYPT_COST = '10';
process.env.LOCK_TIMEOUT_MINUTES = '15';
process.env.EMAIL_PROVIDER = 'resend';
process.env.EMAIL_FROM = 'Test <test@example.com>';
process.env.CORS_ORIGIN = 'http://localhost:5173';
