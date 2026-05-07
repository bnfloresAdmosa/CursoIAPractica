# Backlog — Mini Jira MVP

**Product Owner:** Laura  
**Fecha:** 21 de Abril 2026  
**Sprint objetivo:** Semana 1 — Core funcional (Auth + Tickets + Concurrencia)

---

## Historia 1 — Autenticación y Control de Acceso por Rol

**Como** miembro del equipo  
**Quiero** iniciar sesión y operar según mi rol en cada proyecto  
**Para que** cada persona tenga acceso únicamente a lo que le corresponde

```gherkin
Feature: Autenticación y roles por proyecto

  Scenario: Inicio de sesión exitoso con credenciales válidas
    Given un usuario registrado con email y contraseña válidos
    When el usuario envía sus credenciales
    Then el sistema emite un JWT de acceso y un refresh token
    And el usuario accede al listado de sus proyectos

  Scenario: Acceso denegado con contraseña incorrecta
    Given un usuario registrado
    When el usuario envía una contraseña incorrecta
    Then el sistema rechaza la solicitud con error 401
    And no se emite ningún token

  Scenario: Admin del proyecto puede archivar un ticket
    Given un usuario con rol Admin en el proyecto "Plataforma Core"
    When el usuario solicita archivar el ticket "Bug en login"
    Then el ticket queda marcado con archived_at
    And el ticket deja de aparecer en la vista activa del proyecto

  Scenario: Usuario regular no puede archivar un ticket
    Given un usuario con rol Usuario en el proyecto "Plataforma Core"
    When el usuario intenta archivar el ticket "Bug en login"
    Then el sistema rechaza la acción con error 403
    And el ticket permanece activo

  Scenario: Un mismo usuario opera con roles distintos en proyectos diferentes
    Given que Ana es Admin en "Proyecto A" y Usuario en "Proyecto B"
    When Ana accede al "Proyecto B"
    Then Ana no puede archivar ni reasignar tickets en ese proyecto
    And cuando Ana accede al "Proyecto A" sí puede ejecutar esas acciones
```

**Criterios de aceptación adicionales:**
- JWT incluye `user_id` y el mapa de roles por proyecto.
- Las contraseñas se almacenan con bcrypt (cost factor ≥ 12).
- Sesión expira en 1 hora; refresh token válido por 7 días.

---

## Historia 2 — Ciclo de Vida Completo de un Ticket

**Como** miembro del equipo autenticado  
**Quiero** crear y gestionar tickets dentro de un proyecto  
**Para** poder registrar, priorizar y dar seguimiento al trabajo del equipo

```gherkin
Feature: Creación y gestión de tickets

  Scenario: Creación exitosa de un ticket con campos obligatorios
    Given un usuario autenticado con acceso al proyecto "Plataforma Core"
    When el usuario crea un ticket con título, estado y prioridad válidos
    Then el ticket se persiste con created_by del usuario autenticado
    And se registra el timestamp de creación en UTC

  Scenario: No se puede crear un ticket sin título
    Given un usuario autenticado con acceso al proyecto
    When el usuario intenta crear un ticket sin título
    Then el sistema rechaza la solicitud con error de validación
    And no se crea ningún registro en la base de datos

  Scenario: Cambio de estado genera registro de auditoría
    Given un ticket en estado "Por hacer" asignado a Carlos
    When Carlos cambia el estado a "En progreso"
    Then el ticket refleja el nuevo estado
    And el log de auditoría registra {campo: "status", valor_anterior: "Por hacer", valor_nuevo: "En progreso", actor: Carlos}
    And ese registro de auditoría es inmutable

  Scenario: Solo el Admin puede asignar o reasignar usuarios a un ticket
    Given un ticket sin asignados en el proyecto "Plataforma Core"
    When el Admin asigna a María y a Jorge al ticket
    Then ambos usuarios aparecen como asignados
    And se envía notificación por email a María y a Jorge

  Scenario: Archivar un ticket no lo elimina físicamente
    Given un ticket existente en el proyecto
    When el Admin archiva el ticket
    Then el ticket tiene archived_at con timestamp
    And el ticket sigue existente en la base de datos
    And no aparece en la vista activa sin el filtro "Archivados"
```

**Criterios de aceptación adicionales:**
- El título tiene un máximo de 255 caracteres; validación en frontend y backend.
- Las transiciones de estado son libres: cualquier estado puede ir a cualquier otro.
- Cada cambio de estado escribe un registro inmutable en `AuditLog`.
- El soft delete usa el campo `archived_at`; nunca se ejecuta `DELETE` en la tabla `Ticket`.

---

## Historia 3 — Bloqueo Pesimista para Edición Concurrente

**Como** miembro del equipo  
**Quiero** saber si un ticket está siendo editado por otro usuario  
**Para que** no se pierdan cambios por ediciones concurrentes

```gherkin
Feature: Bloqueo pesimista de tickets en edición

  Scenario: El primer editor adquiere el bloqueo
    Given el ticket "Bug en login" no está bloqueado
    When Carlos abre el ticket en modo edición
    Then el sistema registra el bloqueo con locked_by=Carlos y expires_at=now+15min
    And Carlos puede editar el ticket

  Scenario: Segundo usuario ve el bloqueo activo
    Given el ticket "Bug en login" está bloqueado por Carlos
    When María intenta abrir el ticket en modo edición
    Then María ve el banner "En edición por Carlos — hace X minutos"
    And el formulario de edición permanece deshabilitado para María

  Scenario: El bloqueo se libera al guardar cambios
    Given Carlos tiene el bloqueo sobre el ticket "Bug en login"
    When Carlos guarda los cambios
    Then el registro de bloqueo se elimina
    And María puede adquirir el bloqueo en su próximo intento

  Scenario: El bloqueo expira automáticamente por inactividad
    Given Carlos tiene el bloqueo sobre "Bug en login" con expires_at vencido
    When cualquier usuario intenta editar el ticket
    Then el sistema detecta que el bloqueo expiró
    And libera el bloqueo automáticamente
    And permite que el nuevo usuario adquiera el bloqueo

  Scenario: Los comentarios no requieren ni respetan el bloqueo
    Given el ticket "Bug en login" está bloqueado por Carlos
    When María agrega un comentario al ticket
    Then el comentario se persiste correctamente
    And el bloqueo de Carlos no se ve afectado
```

**Criterios de aceptación adicionales:**
- El timeout de 15 minutos se configura mediante variable de entorno `LOCK_TIMEOUT_MINUTES`.
- El cambio de estado requiere que el usuario tenga el bloqueo activo.
- El bloqueo aplica al ticket completo, no por campo individual.
- El banner muestra el nombre del editor y el tiempo transcurrido desde `locked_at`.

---

## Priorización

| # | Historia | Prioridad | Semana |
|---|---|---|---|
| 1 | Autenticación y roles | Crítica | 1 |
| 2 | Ciclo de vida del ticket | Crítica | 1 |
| 3 | Bloqueo pesimista | Crítica | 2 |

> Las historias 1 y 2 son prerrequisito de todo lo demás.  
> La historia 3 es el principal riesgo técnico del MVP y debe validarse con un spike en la semana 1.

---

## Edge Cases por Historia

### Historia 1 — Autenticación y roles

```gherkin
  # Edge Case 1: Refresh token expirado
  Scenario: Usuario intenta renovar sesión con refresh token vencido
    Given un usuario autenticado cuyo refresh token expiró hace 1 hora
    When el cliente envía el refresh token al endpoint de renovación
    Then el sistema rechaza la solicitud con error 401
    And no emite ningún token nuevo
    And el cliente redirige al usuario a la pantalla de login

  # Edge Case 2: Token válido pero usuario sin rol en el proyecto
  Scenario: Usuario autenticado intenta acceder a un proyecto al que no pertenece
    Given un usuario con JWT válido
    And el usuario no tiene ningún ProjectMember en el proyecto "Proyecto Secreto"
    When el usuario solicita la lista de tickets de "Proyecto Secreto"
    Then el sistema responde con error 403
    And no devuelve ningún dato del proyecto
```

---

### Historia 2 — Ciclo de vida del ticket

```gherkin
  # Edge Case 1: Título en el límite exacto de caracteres
  Scenario: Crear un ticket con título de exactamente 255 caracteres
    Given un usuario autenticado con acceso al proyecto
    When el usuario crea un ticket con un título de exactamente 255 caracteres
    Then el ticket se persiste correctamente
    And cuando el usuario intenta crear un ticket con 256 caracteres
    Then el sistema rechaza la solicitud con error de validación en el campo título

  # Edge Case 2: Condición de carrera en cambio de estado concurrente
  Scenario: Dos usuarios cambian el estado del mismo ticket casi simultáneamente
    Given el ticket "Bug en login" está en estado "Por hacer"
    And Carlos y María tienen el ticket abierto en modo lectura
    When Carlos cambia el estado a "En progreso" y lo guarda
    And María intenta cambiar el estado a "Listo" en el mismo instante sin haber adquirido el bloqueo
    Then el sistema rechaza el cambio de María con error de conflicto
    And el estado final del ticket es "En progreso" (el cambio de Carlos)
    And el log de auditoría contiene únicamente la transición de Carlos
```

---

### Historia 3 — Bloqueo pesimista

```gherkin
  # Edge Case 1: Editor pierde conexión sin liberar el bloqueo
  Scenario: El navegador del editor se cierra abruptamente sin guardar ni cancelar
    Given Carlos tiene el bloqueo activo sobre el ticket "Bug en login"
    When la pestaña del navegador de Carlos se cierra sin llamar al endpoint de liberación
    Then el bloqueo permanece activo hasta que expires_at sea alcanzado
    And durante ese tiempo María ve el banner "En edición por Carlos — hace X minutos"
    And una vez vencido el expires_at el sistema libera el bloqueo automáticamente
    And María puede adquirir el bloqueo en su siguiente intento

  # Edge Case 2: Admin intenta editar un ticket bloqueado por un usuario regular
  Scenario: Admin solicita editar un ticket que está bloqueado por otro usuario
    Given el ticket "Bug en login" está bloqueado por María (rol Usuario)
    When el Admin intenta abrir el ticket en modo edición
    Then el sistema muestra el banner "En edición por María — hace X minutos"
    And el Admin no puede editar el ticket mientras el bloqueo esté activo
    And el Admin puede forzar la liberación del bloqueo mediante una acción explícita de "Forzar desbloqueo"
    And si el Admin fuerza el desbloqueo se registra un evento de auditoría con actor=Admin y acción="force_unlock"
```
