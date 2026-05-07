🛠 Stack & Infra

Backend: Node.js/TS, Prisma ORM, PostgreSQL.

Frontend: React 18, Tailwind, shadcn/ui.

Auth: JWT + Refresh Tokens.

Email: Resend / Nodemailer.

🗄️ Modelo de Datos (Esencial)

User: id, email, password_hash.

Project: id, name, archived_at (soft delete).

ProjectMember: user_id, project_id, role (ADMIN | USER).

Ticket: id, project_id, status (Por hacer, En progreso, Listo), priority (Alta, Media, Baja), archived_at.

TicketLock: ticket_id, locked_by, expires_at (15m TTL).

AuditLog: ticket_id, field, old_value, new_value, actor_id (Inmutable).

🔑 Roles y Permisos (RBAC por Proyecto)

Admin: Gestión total del proyecto, asignación de usuarios y archivado de tickets.

User: Crea tickets. Edita, comenta y cambia estado solo de sus tickets asignados.

Global: Un usuario puede tener roles distintos en diferentes proyectos.

📋 Historias de Usuario (HUs)

Épica 1: Autenticación (P0)

HU-01 Login: Flujo JWT. Error 401 genérico para credenciales inválidas.

HU-02 Control Roles: Validación de permisos en cada request según ProjectMember.

Épica 2: Proyectos (P1)

HU-03 Crear: Creador = Admin automático. Nombre no es único globalmente.

HU-04 Archivar: Soft delete vía archived_at. Visible solo con filtro.

Épica 3: Tickets (P0-P1)

HU-05/06 CRUD: Título (255 chars), prioridad obligatoria. Solo miembros del proyecto pueden crear/ver.

HU-07 Estados: Transición libre (Cualquiera -> Cualquiera). Genera AuditLog obligatorio.

HU-08/09 Gestión Admin: Solo Admin archiva y (re)asigna usuarios.

Épica 4: Concurrencia - Pessimistic Locking (P0)

HU-12 TicketLock: - Bloqueo al abrir edición. Banner: "En edición por [X]".

Timeout: 15 min de inactividad.

Conflicto: Error 409 si el lock expira antes de persistir.

Liberación: Al guardar o cancelar.

Épica 5: Comentarios y Notificaciones (P1-P2)

HU-10/11 Comentarios: No requieren bloqueo. Edición/Borrado solo por autor o Admin.

HU-15/16 Notificaciones: Email al ser asignado y por menciones (@user). Proceso asíncrono (no bloquea DB).

Épica 6: Visualización y Métricas (P1)

HU-13 Filtros: Lógica AND para estado, prioridad, etiqueta y asignado + búsqueda de texto.

HU-14 Dashboard:

Histórico: Tickets llegados a "Listo" por mes (usando AuditLog).

Snapshot: Distribución actual por estado y prioridad.

⚠️ Reglas Críticas (No negociables)

Pessimistic Lock: Obligatorio para cambio de estado y edición de campos core.

AuditLog: Cualquier cambio en status DEBE registrarse para que el Dashboard funcione.

Soft Delete: Ningún Project o Ticket se elimina físicamente (usar archived_at).

Validación: Validar que el usuario pertenezca al proyecto antes de cualquier operación de ticket.