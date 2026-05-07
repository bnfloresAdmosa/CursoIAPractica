-- =============================================================
-- Mock Data — Mini Jira
-- Supabase / PostgreSQL compatible
-- =============================================================

-- -------------------------------------------------------------
-- USERS (passwords = bcrypt de "password123", cost 12)
-- -------------------------------------------------------------
INSERT INTO "user" (id, name, email, password_hash, created_at) VALUES
  (1, 'Ana Martínez',  'ana.martinez@empresa.com',  '$2b$12$KIx6oM7eGvzQwLpR3nT5uuVhYvE1Oc2.JqFdRk9sXmN0bHwPaGcLe', '2026-04-01 09:00:00+00'),
  (2, 'Carlos Ruiz',   'carlos.ruiz@empresa.com',   '$2b$12$KIx6oM7eGvzQwLpR3nT5uuVhYvE1Oc2.JqFdRk9sXmN0bHwPaGcLe', '2026-04-01 09:05:00+00'),
  (3, 'María López',   'maria.lopez@empresa.com',   '$2b$12$KIx6oM7eGvzQwLpR3nT5uuVhYvE1Oc2.JqFdRk9sXmN0bHwPaGcLe', '2026-04-01 09:10:00+00');

-- -------------------------------------------------------------
-- PRIORITIES (catálogo — orden 1=más alta)
-- -------------------------------------------------------------
INSERT INTO priority (id, name, "order") VALUES
  (1, 'Alta',  1),
  (2, 'Media', 2),
  (3, 'Baja',  3);

-- -------------------------------------------------------------
-- PROJECTS
-- -------------------------------------------------------------
INSERT INTO project (id, name, description, archived_at, created_by) VALUES
  (1, 'Plataforma Core', 'Backend y APIs principales del producto', NULL, 1),
  (2, 'Portal Cliente',  'Interfaz web orientada al cliente final',  NULL, 2);

-- -------------------------------------------------------------
-- PROJECT MEMBERS
-- Ana  = Admin  en Plataforma Core
-- Carlos = Admin en Portal Cliente, Usuario en Plataforma Core
-- María  = Usuario en ambos
-- -------------------------------------------------------------
INSERT INTO project_member (id, user_id, project_id, role) VALUES
  (1, 1, 1, 'ADMIN'),
  (2, 2, 1, 'USER'),
  (3, 3, 1, 'USER'),
  (4, 2, 2, 'ADMIN'),
  (5, 3, 2, 'USER');

-- -------------------------------------------------------------
-- TAGS
-- -------------------------------------------------------------
INSERT INTO tag (id, name, color) VALUES
  (1, 'bug',      '#EF4444'),
  (2, 'feature',  '#3B82F6'),
  (3, 'mejora',   '#F59E0B'),
  (4, 'seguridad','#8B5CF6'),
  (5, 'deuda-técnica', '#6B7280');

-- -------------------------------------------------------------
-- TICKETS (5 tickets en los 3 estados)
-- -------------------------------------------------------------
INSERT INTO ticket (id, title, description, status, priority_id, project_id, created_by, archived_at, created_at, updated_at) VALUES
  (1,
   'Corregir error 500 en endpoint /auth/refresh',
   'El endpoint devuelve 500 cuando el refresh token tiene formato válido pero está expirado. Debería retornar 401.',
   'Por hacer',
   1,  -- Alta
   1, 1, NULL,
   '2026-04-14 10:00:00+00', '2026-04-14 10:00:00+00'),

  (2,
   'Implementar paginación en listado de tickets',
   'La vista de tickets carga todos los registros sin paginar. Implementar cursor-based pagination con límite de 20 por página.',
   'Por hacer',
   2,  -- Media
   1, 2, NULL,
   '2026-04-15 08:30:00+00', '2026-04-15 08:30:00+00'),

  (3,
   'Integrar bloqueo pesimista en formulario de edición',
   'Conectar el frontend con el endpoint PUT /tickets/:id/lock. Mostrar banner "En edición por [Nombre]" cuando el ticket esté bloqueado.',
   'En progreso',
   1,  -- Alta
   1, 1, NULL,
   '2026-04-16 09:15:00+00', '2026-04-18 11:40:00+00'),

  (4,
   'Diseñar componente de filtros combinables',
   'Crear el panel de filtros lateral con chips para estado, prioridad, etiqueta y asignado. Los filtros se aplican con AND.',
   'En progreso',
   2,  -- Media
   2, 3, NULL,
   '2026-04-17 14:00:00+00', '2026-04-19 16:20:00+00'),

  (5,
   'Configurar ESLint y Prettier en el monorepo',
   'Añadir .eslintrc y .prettierrc compartidos en la raíz. Integrar el check en el pipeline de CI.',
   'Listo',
   3,  -- Baja
   1, 2, NULL,
   '2026-04-10 11:00:00+00', '2026-04-12 17:00:00+00');

-- -------------------------------------------------------------
-- TICKET ASSIGNEES
-- -------------------------------------------------------------
INSERT INTO ticket_assignee (ticket_id, user_id) VALUES
  (1, 2),        -- Ticket 1 → Carlos
  (2, 3),        -- Ticket 2 → María
  (3, 1),        -- Ticket 3 → Ana
  (3, 2),        -- Ticket 3 → Carlos (múltiples asignados)
  (4, 3),        -- Ticket 4 → María
  (5, 2);        -- Ticket 5 → Carlos

-- -------------------------------------------------------------
-- TICKET TAGS
-- -------------------------------------------------------------
INSERT INTO ticket_tag (ticket_id, tag_id) VALUES
  (1, 1),  -- bug
  (1, 4),  -- seguridad
  (2, 2),  -- feature
  (3, 2),  -- feature
  (3, 3),  -- mejora
  (4, 2),  -- feature
  (5, 5);  -- deuda-técnica

-- -------------------------------------------------------------
-- COMMENTS
-- -------------------------------------------------------------
INSERT INTO comment (id, ticket_id, user_id, body, created_at, deleted_at) VALUES
  (1, 1, 2, 'Reproduje el bug localmente. El problema está en el middleware de validación — está lanzando una excepción no controlada en lugar de llamar next(err).', '2026-04-14 14:22:00+00', NULL),
  (2, 1, 1, 'Confirmado. @carlos.ruiz asignado para el fix. Por favor incluir test unitario para el caso de token expirado.', '2026-04-14 15:05:00+00', NULL),
  (3, 3, 1, 'El endpoint de lock ya está listo en backend. Pendiente conectar el polling del banner cada 30 segundos desde el frontend.', '2026-04-18 10:00:00+00', NULL),
  (4, 5, 3, 'Revisé la config en el PR. Todo se ve bien, solo ajustar la regla no-console para permitir console.error en producción.', '2026-04-11 09:45:00+00', NULL),
  (5, 5, 2, 'Ajustado. CI pasó en verde. Cerrando ticket.', '2026-04-12 16:50:00+00', NULL);

-- -------------------------------------------------------------
-- AUDIT LOG (cambios de estado registrados)
-- -------------------------------------------------------------
INSERT INTO audit_log (id, ticket_id, field, old_value, new_value, actor_id, timestamp) VALUES
  (1, 3, 'status', 'Por hacer',   'En progreso', 1, '2026-04-18 11:40:00+00'),
  (2, 4, 'status', 'Por hacer',   'En progreso', 3, '2026-04-19 16:20:00+00'),
  (3, 5, 'status', 'Por hacer',   'En progreso', 2, '2026-04-11 08:00:00+00'),
  (4, 5, 'status', 'En progreso', 'Listo',       2, '2026-04-12 17:00:00+00');
