# Arquitectura — Mini Jira (Modelo C4 — Nivel Contenedores)

```mermaid
C4Container
    title Diagrama de Contenedores — Mini Jira MVP

    Person(usuario, "Usuario", "Miembro del equipo con rol Usuario en uno o más proyectos")
    Person(admin, "Admin de Proyecto", "Miembro con rol Admin; gestiona tickets, asignados y etiquetas")

    System_Boundary(minijira, "Mini Jira") {

        Container(spa, "Single Page Application", "React 18, TypeScript, Vite, shadcn/ui, React Router v6", "Interfaz web para login, gestión de proyectos y tickets, bloqueo pesimista y dashboard de métricas")

        Container(api, "API Backend", "Node.js, TypeScript, Express, JWT, bcrypt", "Expone endpoints REST para autenticación, CRUD de tickets y proyectos, control de bloqueos, auditoría y disparo de notificaciones")

        ContainerDb(db, "Base de Datos", "PostgreSQL 15", "Persiste usuarios, proyectos, tickets, asignados, etiquetas, comentarios, log de auditoría y registros de bloqueo pesimista")
    }

    System_Ext(email, "Servicio de Email", "Resend / Nodemailer SMTP", "Entrega notificaciones transaccionales por asignación de ticket y menciones con @usuario")

    Rel(usuario, spa, "Usa", "HTTPS")
    Rel(admin, spa, "Usa", "HTTPS")
    Rel(spa, api, "Consume API REST", "HTTPS / JSON")
    Rel(api, db, "Lee y escribe", "Prisma ORM / TCP 5432")
    Rel(api, email, "Envía notificaciones", "HTTPS / API")
```

---

## Decisiones de diseño relevantes

| Área | Decisión | Justificación |
|---|---|---|
| Bloqueo pesimista | Tabla `TicketLock` en PostgreSQL con `expires_at` | Evita estado distribuido; el timeout se controla vía `LOCK_TIMEOUT_MINUTES` en env |
| Auditoría inmutable | Tabla `AuditLog` sin UPDATE ni DELETE | Garantiza trazabilidad de cambios de estado para el dashboard de métricas |
| Soft delete universal | Campos `archived_at` en `Ticket` y `Project` | Nunca se ejecuta `DELETE`; los registros archivados son recuperables |
| Roles por proyecto | Tabla `ProjectMember` con enum `ADMIN\|USER` | Un mismo usuario puede tener roles distintos en diferentes proyectos |
| Email síncrono | Llamada directa desde API al proveedor de email | Suficiente para MVP con equipo de 10 personas; sin necesidad de cola de mensajes |
| Sin superadmin global | Roles únicamente a nivel de proyecto | No existe caso de uso definido para el MVP |
