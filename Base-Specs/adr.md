# ADR-001 — Uso de Supabase en lugar de Firebase como plataforma de backend

**Estado:** Aceptado  
**Fecha:** 21 de Abril 2026  
**Autores:** Marcos (Tech Lead)  
**Revisores:** Laura (PO), Roberto (PM)

---

## Contexto

El MVP de Mini Jira requiere una plataforma de backend que soporte:

- Un **modelo de datos relacional** con 9 entidades vinculadas por FK (`User`, `Project`, `ProjectMember`, `Ticket`, `TicketAssignee`, `TicketTag`, `Comment`, `AuditLog`, `TicketLock`).
- **Integridad referencial** estricta: un ticket no puede existir sin proyecto; un asignado debe ser miembro del proyecto.
- **Bloqueo pesimista** implementado como registro en tabla `TicketLock` con expiración por timestamp.
- **Log de auditoría inmutable** que alimenta el dashboard de métricas (tickets cerrados por mes, distribución por estado y prioridad).
- **Autenticación JWT** con refresh tokens y roles diferenciados por proyecto.
- **Migraciones de esquema** controladas desde el día 1 (requisito explícito del PRD para evitar roturas post-inicio).
- Entorno de desarrollo local reproducible con Docker Compose.

El equipo evaluó dos plataformas: **Supabase** y **Firebase (Google)**.

---

## Opciones evaluadas

### Opción A — Supabase

Plataforma open-source construida sobre **PostgreSQL**. Provee base de datos relacional, autenticación, almacenamiento y API autogenerada.

**A favor:**
- Motor PostgreSQL nativo → compatible con el stack definido en el PRD sin cambios.
- **Prisma ORM funciona directamente** con la cadena de conexión de Supabase; `prisma migrate` corre sin adaptadores adicionales.
- Soporte nativo de transacciones ACID: el flujo de guardar un ticket (UPDATE + INSERT AuditLog + DELETE TicketLock) puede ejecutarse en una sola transacción atómica.
- **Row Level Security (RLS)** de PostgreSQL permite reforzar los roles Admin/Usuario a nivel de base de datos como capa adicional de defensa.
- Consultas SQL complejas para el dashboard de métricas (GROUP BY mes, JOIN con AuditLog) sin restricciones del motor.
- Self-hosteable: si el equipo decide migrar a infraestructura propia, la base de datos es PostgreSQL estándar.
- Plan gratuito suficiente para un equipo de 10 personas en MVP.

**En contra:**
- Menor ecosistema de SDKs mobile que Firebase (no relevante: el PRD es desktop-first).
- El tiempo real (Realtime) de Supabase está fuera de scope del MVP.

---

### Opción B — Firebase (Firestore + Firebase Auth)

Plataforma de Google basada en **Firestore** (base de datos NoSQL orientada a documentos) con autenticación integrada.

**A favor:**
- Alta disponibilidad y escalabilidad automática gestionada por Google.
- SDK con soporte nativo de sincronización en tiempo real.
- Amplia documentación y comunidad.

**En contra:**
- **Firestore es NoSQL**: no soporta FK, JOIN, ni transacciones multi-colección con la misma garantía que SQL. El modelo de datos del PRD (9 entidades relacionadas) requeriría desnormalización significativa.
- **Prisma no soporta Firestore**. Sería necesario abandonar el ORM definido en el stack o incorporar un adaptador no oficial.
- El log de auditoría y el dashboard de métricas requieren agregaciones (GROUP BY, window functions) que Firestore no soporta nativamente; se necesitaría Cloud Functions o BigQuery como capa adicional.
- El bloqueo pesimista con `expires_at` es complejo de implementar de forma consistente en Firestore sin transacciones SQL.
- La condición de carrera del edge case (dos usuarios cambiando estado simultáneamente) es más difícil de resolver sin `SELECT FOR UPDATE`.
- Firebase Auth emite JWTs con estructura fija de Google; personalizar el payload (`user_id` + mapa de roles por proyecto) requiere Custom Claims y lógica adicional en Cloud Functions.
- Vendor lock-in total con Google Cloud; migración futura costosa.

---

## Decisión

**Se elige Supabase (Opción A).**

El modelo de datos del Mini Jira es inherentemente relacional. Las reglas de negocio críticas —integridad referencial, auditoría inmutable, bloqueo pesimista atómico y roles por proyecto— se implementan de forma natural y segura en PostgreSQL. Supabase expone PostgreSQL directamente, lo que mantiene la compatibilidad total con Prisma y Docker Compose sin introducir ningún cambio en el stack acordado.

Firebase exigiría rediseñar el modelo de datos, reemplazar Prisma y añadir servicios externos para suplir capacidades SQL que el PRD da por sentadas. El costo técnico supera con creces cualquier ventaja operativa para un equipo de 10 personas.

---

## Consecuencias

### Positivas

- El stack del PRD (Node.js + Prisma + PostgreSQL) se mantiene **sin modificaciones**.
- `prisma migrate dev` gestiona la evolución del esquema desde el día 1, mitigando el riesgo de roturas post-inicio identificado en la tabla de riesgos del PRD.
- Las transacciones atómicas de PostgreSQL garantizan que `UPDATE Ticket + INSERT AuditLog + DELETE TicketLock` sean consistentes incluso bajo carga concurrente.
- El timeout de bloqueo (`LOCK_TIMEOUT_MINUTES`) se puede ajustar como variable de entorno sin cambios en la capa de base de datos.
- RLS de PostgreSQL ofrece una segunda barrera de seguridad para los roles Admin/Usuario, independiente de la lógica del API.

### Negativas / Riesgos asumidos

- **Dependencia de Supabase Cloud** en staging/producción. Mitigación: al ser PostgreSQL estándar, la migración a una instancia propia (Railway, Render, instancia EC2) es directa.
- El plan gratuito de Supabase tiene límite de 500 MB de almacenamiento y 2 GB de transferencia mensual. Para un equipo de 10 personas en MVP esto es suficiente, pero debe monitorizarse al escalar.
- Las funcionalidades de Supabase Auth (magic links, OAuth) no se usarán en MVP; se implementa JWT propio con bcrypt según el PRD. Esto evita acoplamiento con la capa de auth de Supabase.

### Neutrales

- El entorno local de desarrollo sigue usando **Docker Compose con una imagen oficial de PostgreSQL**, independientemente de Supabase. Supabase solo entra en staging/producción.
- La decisión es **reversible**: si el equipo decide auto-hostear PostgreSQL, basta con cambiar la `DATABASE_URL` en las variables de entorno.

---

## Referencias

- PRD Mini Jira v1.0 — Sección 4 (Stack Tecnológico) y Sección 6 (Riesgos)
- Backlog — Historia 2 (Ciclo de vida del ticket, edge case de condición de carrera)
- Backlog — Historia 3 (Bloqueo pesimista, edge case de cierre abrupto del navegador)
