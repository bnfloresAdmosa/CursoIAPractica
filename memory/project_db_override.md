---
name: Mini Jira — DB override a SQL Server
description: En el proyecto Mini Jira, el usuario eligió SQL Server 2022 como motor de BD, anulando ADR-001 que había decidido Supabase/PostgreSQL.
type: project
---

En el proyecto **Mini Jira** (`CursoIAPractica/`), la BD acordada es **Microsoft SQL Server 2022** en todos los ambientes, no PostgreSQL/Supabase.

**Why:** El usuario indicó "quiero cambiar a sql server, en mi entorno de prueba" durante la fase de definición de `CLAUDE.md`. Es un ejercicio de práctica del curso, por lo que prima la disponibilidad local del motor sobre la decisión arquitectónica original.

**How to apply:**
- Prisma `datasource.provider = "sqlserver"`.
- `mock.sql` (sintaxis Postgres) requiere portarse a T-SQL: `MERGE` en vez de `ON CONFLICT`, `WITH (UPDLOCK, ROWLOCK)` en vez de `SELECT FOR UPDATE`, `[order]` en vez de `"order"`, `DATETIMEOFFSET` para timestamps con TZ.
- Si en alguna conversación el usuario sugiere retomar ADR-001 (Supabase/PostgreSQL), revisitar las cuatro adaptaciones SQL-Server-only listadas en `CLAUDE.md` §1.
- ADR-001 en `Base-Specs/adr.md` queda como referencia histórica, no autoritativa.
