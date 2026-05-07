# Backlog — Mini Jira MVP

**Versión:** 1.0  
**Fecha:** 22 de Abril 2026  
**Basado en:** PRD v1.0 (specs.md)

---

## Convenciones

- **Prioridad:** P0 = bloqueante para MVP | P1 = core MVP | P2 = complementa MVP
- **Criterios de Aceptación** en sintaxis Gherkin (Feature / Scenario / Given / When / Then)
- Los escenarios marcados con `[BORDE]` cubren casos límite o flujos de error.

---

## ÉPICA 1 — Autenticación y Roles

---

### HU-01 · Login con usuario y contraseña

**Como** miembro del equipo  
**Quiero** iniciar sesión con mi correo y contraseña  
**Para** acceder a la herramienta de manera segura

**Prioridad:** P0

```gherkin
Feature: Login de usuario

  Scenario: Login exitoso
    Given el usuario existe en el sistema con email "ana@empresa.com"
    And su contraseña es válida
    When envía el formulario de login con credenciales correctas
    Then el sistema genera un JWT de acceso y un refresh token
    And redirige al usuario al listado de proyectos

  Scenario: [BORDE] Contraseña incorrecta
    Given el usuario existe con email "ana@empresa.com"
    When envía el formulario con contraseña incorrecta
    Then el sistema responde con error 401
    And muestra el mensaje "Credenciales inválidas"
    And no genera ningún token

  Scenario: [BORDE] Email no registrado
    Given que no existe ningún usuario con email "fantasma@empresa.com"
    When envía el formulario con ese email
    Then el sistema responde con error 401
    And muestra el mismo mensaje genérico "Credenciales inválidas"
    And no revela si el email existe o no en el sistema

  Scenario: [BORDE] Campos vacíos
    Given el formulario de login está vacío
    When el usuario intenta enviar el formulario
    Then el sistema muestra validación en línea en los campos requeridos
    And no realiza ninguna llamada al backend

  Scenario: [BORDE] JWT expirado
    Given el usuario tiene un JWT cuyo tiempo de expiración ya pasó
    When realiza una petición autenticada con ese token
    Then el sistema responde con error 401
    And el cliente intenta renovar usando el refresh token
    And si el refresh token también expiró, redirige al login
```

---

### HU-02 · Control de roles por proyecto

**Como** sistema  
**Quiero** aplicar permisos diferenciados entre rol Usuario y rol Admin por proyecto  
**Para** que cada usuario tenga acceso únicamente a las acciones que le corresponden

**Prioridad:** P0

```gherkin
Feature: Control de roles por proyecto

  Scenario: Usuario edita únicamente sus tickets asignados
    Given "carlos" tiene rol Usuario en el proyecto "Alpha"
    And existe el ticket T-12 asignado a "carlos" en "Alpha"
    When "carlos" intenta editar T-12
    Then el sistema le permite abrir el formulario de edición

  Scenario: [BORDE] Usuario intenta editar ticket no asignado a él
    Given "carlos" tiene rol Usuario en el proyecto "Alpha"
    And existe el ticket T-99 asignado a otro usuario en "Alpha"
    When "carlos" intenta editar T-99 via API (PUT /tickets/99)
    Then el sistema responde con error 403
    And no modifica el ticket

  Scenario: Admin gestiona cualquier ticket del proyecto
    Given "laura" tiene rol Admin en el proyecto "Alpha"
    And existe el ticket T-55 asignado a otro usuario
    When "laura" intenta editar T-55
    Then el sistema le permite abrir el formulario de edición

  Scenario: Usuario con doble rol en proyectos distintos
    Given "marcos" tiene rol Admin en "Alpha"
    And "marcos" tiene rol Usuario en "Beta"
    When "marcos" accede al proyecto "Beta"
    Then su panel muestra únicamente las acciones de rol Usuario
    When "marcos" accede al proyecto "Alpha"
    Then su panel muestra las acciones de rol Admin

  Scenario: [BORDE] Acción de Admin ejecutada desde proyecto incorrecto
    Given "laura" es Admin en "Alpha" pero Usuario en "Beta"
    When "laura" intenta archivar un ticket del proyecto "Beta" via API
    Then el sistema responde con error 403
```

---

## ÉPICA 2 — Gestión de Proyectos

---

### HU-03 · Crear proyecto

**Como** Admin  
**Quiero** crear un nuevo proyecto con nombre y descripción  
**Para** organizar los tickets de un área de trabajo

**Prioridad:** P1

```gherkin
Feature: Crear proyecto

  Scenario: Creación exitosa con todos los campos
    Given el usuario tiene sesión activa
    When envía el formulario con nombre "Rediseño Web" y descripción opcional
    Then el sistema persiste el proyecto con archived_at = NULL
    And retorna el proyecto creado con su id
    And establece al usuario creador como Admin del proyecto

  Scenario: [BORDE] Nombre de proyecto vacío
    Given el usuario tiene sesión activa
    When envía el formulario sin nombre
    Then el sistema responde con error 422
    And muestra "El nombre del proyecto es obligatorio"

  Scenario: [BORDE] Nombre duplicado dentro del sistema
    Given ya existe un proyecto activo llamado "Rediseño Web"
    When otro usuario intenta crear un proyecto con el mismo nombre
    Then el sistema permite la creación (los nombres no son únicos globalmente)
    And retorna el nuevo proyecto con un id diferente
```

---

### HU-04 · Archivar proyecto (soft delete)

**Como** Admin de un proyecto  
**Quiero** archivar un proyecto cuando ya no esté activo  
**Para** mantenerlo visible en historial sin que interfiera en el trabajo diario

**Prioridad:** P1

```gherkin
Feature: Archivar proyecto

  Scenario: Admin archiva su proyecto
    Given "laura" es Admin del proyecto "Alpha"
    When ejecuta la acción "Archivar proyecto"
    Then el sistema registra archived_at con el timestamp actual
    And el proyecto desaparece del listado principal
    And sigue apareciendo al aplicar el filtro "Archivados"

  Scenario: [BORDE] Usuario sin rol Admin intenta archivar
    Given "carlos" tiene rol Usuario en "Alpha"
    When intenta archivar el proyecto "Alpha" via API
    Then el sistema responde con error 403
    And el proyecto permanece activo

  Scenario: [BORDE] Proyecto ya archivado vuelve a archivarse
    Given el proyecto "Alpha" ya tiene archived_at definido
    When un Admin ejecuta archivar nuevamente
    Then el sistema actualiza archived_at al nuevo timestamp
    And el estado del proyecto permanece como archivado
```

---

## ÉPICA 3 — Gestión de Tickets

---

### HU-05 · Crear ticket

**Como** cualquier usuario autenticado  
**Quiero** crear un ticket dentro de un proyecto  
**Para** registrar una tarea o incidencia

**Prioridad:** P0

```gherkin
Feature: Crear ticket

  Scenario: Creación exitosa con campos mínimos
    Given el usuario tiene sesión activa y pertenece al proyecto "Alpha"
    When envía el formulario con título "Corregir login" y prioridad "Alta"
    Then el sistema persiste el ticket con estado "Por hacer"
    And registra created_by con el usuario actual
    And registra created_at con timestamp UTC actual

  Scenario: Creación con todos los campos opcionales
    Given el usuario tiene sesión activa
    When envía el formulario con título, descripción, etiquetas y asignados
    Then el sistema persiste todos los campos
    And la relación TicketAssignee y TicketTag se crean correctamente

  Scenario: [BORDE] Título excede 255 caracteres
    Given el usuario tiene sesión activa
    When envía un título de 256 caracteres
    Then el sistema responde con error 422
    And muestra "El título no puede superar 255 caracteres"

  Scenario: [BORDE] Prioridad no enviada
    Given el usuario tiene sesión activa
    When envía el formulario sin campo prioridad
    Then el sistema responde con error 422
    And muestra "La prioridad es obligatoria"

  Scenario: [BORDE] Usuario intenta crear ticket en proyecto al que no pertenece
    Given el usuario no es miembro del proyecto "Secreto"
    When intenta crear un ticket en "Secreto" via API
    Then el sistema responde con error 403
```

---

### HU-06 · Editar ticket

**Como** Admin del proyecto o usuario asignado al ticket  
**Quiero** editar los campos de un ticket  
**Para** mantener la información actualizada

**Prioridad:** P0

```gherkin
Feature: Editar ticket

  Scenario: Edición exitosa por usuario asignado
    Given "carlos" está asignado al ticket T-12
    And T-12 no tiene un bloqueo activo
    When "carlos" guarda cambios en el título de T-12
    Then el sistema actualiza updated_at con timestamp UTC
    And registra el actor en el campo de última modificación

  Scenario: [BORDE] Campo título editado a cadena vacía
    Given el usuario tiene el ticket T-12 en edición
    When guarda el ticket con título vacío
    Then el sistema responde con error 422
    And no persiste el cambio

  Scenario: [BORDE] Usuario no asignado intenta editar
    Given "pedro" no está asignado al ticket T-12
    And "pedro" tiene rol Usuario en el proyecto
    When "pedro" intenta editar T-12 via API
    Then el sistema responde con error 403
```

---

### HU-07 · Cambiar estado de ticket

**Como** usuario asignado o Admin  
**Quiero** cambiar el estado de un ticket entre "Por hacer", "En progreso" y "Listo"  
**Para** reflejar el avance real de la tarea

**Prioridad:** P0

```gherkin
Feature: Cambiar estado de ticket

  Scenario: Transición libre de estado
    Given el ticket T-12 está en estado "Por hacer"
    And el usuario tiene el bloqueo de edición activo
    When cambia el estado a "Listo"
    Then el sistema actualiza el campo status a "Listo"
    And registra un AuditLog: {ticket_id: T-12, field: "status", old_value: "Por hacer", new_value: "Listo", actor: usuario, timestamp: ahora}

  Scenario: Todas las transiciones son válidas
    Given el ticket T-12 está en estado "Listo"
    When el usuario lo mueve de vuelta a "Por hacer"
    Then el sistema acepta la transición sin restricciones
    And registra el cambio en AuditLog

  Scenario: [BORDE] Cambio de estado sin bloqueo activo
    Given el ticket T-12 no tiene bloqueo de edición para el usuario actual
    When el usuario intenta cambiar el estado via API
    Then el sistema responde con error 409
    And muestra "Debes adquirir el bloqueo de edición antes de modificar el ticket"

  Scenario: [BORDE] Valor de estado inválido
    Given el usuario tiene el bloqueo de T-12
    When envía status = "Cancelado" (valor fuera del catálogo)
    Then el sistema responde con error 422
    And no modifica el ticket ni genera AuditLog
```

---

### HU-08 · Archivar ticket (soft delete)

**Como** Admin del proyecto  
**Quiero** archivar un ticket usando el botón "Eliminar"  
**Para** sacarlo de la vista activa sin perder su historial

**Prioridad:** P1

```gherkin
Feature: Archivar ticket

  Scenario: Admin archiva un ticket
    Given "laura" es Admin del proyecto "Alpha"
    And el ticket T-30 pertenece a "Alpha"
    When ejecuta "Eliminar" sobre T-30
    Then el sistema establece archived_at en T-30 con timestamp UTC
    And T-30 desaparece de la vista de tickets activos
    And el historial de auditoría de T-30 permanece intacto

  Scenario: [BORDE] Usuario sin rol Admin intenta archivar
    Given "carlos" tiene rol Usuario en "Alpha"
    When intenta archivar T-30 via API
    Then el sistema responde con error 403
    And T-30 permanece activo

  Scenario: [BORDE] Archivar ticket ya archivado
    Given T-30 ya tiene archived_at definido
    When el Admin ejecuta archivar nuevamente
    Then el sistema actualiza archived_at al nuevo timestamp
    And retorna 200 (operación idempotente)
```

---

### HU-09 · Asignar y reasignar usuarios a un ticket

**Como** Admin del proyecto  
**Quiero** asignar uno o más usuarios a un ticket  
**Para** que quede claro quién es responsable de cada tarea

**Prioridad:** P1

```gherkin
Feature: Asignación de ticket

  Scenario: Admin asigna un usuario
    Given "laura" es Admin en "Alpha"
    And "carlos" es miembro de "Alpha"
    When "laura" agrega a "carlos" como asignado de T-10
    Then el sistema crea el registro en TicketAssignee
    And se dispara una notificación por email a "carlos"

  Scenario: Admin asigna múltiples usuarios
    Given "laura" es Admin en "Alpha"
    When asigna a "carlos" y "diana" al ticket T-10
    Then ambos aparecen en la lista de asignados de T-10
    And se envía email de notificación a cada uno

  Scenario: Admin quita un asignado
    Given T-10 tiene a "carlos" como asignado
    When "laura" elimina a "carlos" de los asignados
    Then el registro en TicketAssignee se elimina
    And "carlos" ya no puede editar T-10 (a menos que sea Admin)

  Scenario: [BORDE] Usuario sin rol Admin intenta asignar
    Given "carlos" tiene rol Usuario en "Alpha"
    When intenta asignar a "diana" al ticket T-10 via API
    Then el sistema responde con error 403

  Scenario: [BORDE] Asignar usuario que no es miembro del proyecto
    Given "externo" no pertenece al proyecto "Alpha"
    When "laura" intenta asignarlo al ticket T-10
    Then el sistema responde con error 422
    And muestra "El usuario no es miembro de este proyecto"
```

---

## ÉPICA 4 — Comentarios

---

### HU-10 · Agregar comentario a un ticket

**Como** usuario asignado al ticket o Admin  
**Quiero** agregar comentarios a un ticket  
**Para** comunicar avances, bloqueos o aclaraciones

**Prioridad:** P1

```gherkin
Feature: Agregar comentario

  Scenario: Asignado agrega un comentario
    Given "carlos" está asignado al ticket T-12
    When envía el cuerpo del comentario "Avance al 50%"
    Then el sistema persiste el comentario con user_id de "carlos" y created_at UTC
    And deleted_at permanece NULL

  Scenario: Admin agrega un comentario
    Given "laura" es Admin en el proyecto de T-12
    When envía un comentario
    Then el sistema lo persiste correctamente

  Scenario: [BORDE] Comentario con cuerpo vacío
    Given el usuario tiene sesión activa
    When envía un comentario con body = ""
    Then el sistema responde con error 422
    And muestra "El comentario no puede estar vacío"

  Scenario: [BORDE] Usuario no asignado ni Admin intenta comentar
    Given "pedro" no está asignado al ticket T-12 y no es Admin
    When intenta agregar un comentario via API
    Then el sistema responde con error 403

  Scenario: El ticket está bloqueado por otro usuario — el comentario igual se permite
    Given T-12 tiene un bloqueo activo de "diana"
    And "carlos" está asignado a T-12
    When "carlos" agrega un comentario a T-12
    Then el sistema persiste el comentario sin requerir bloqueo
```

---

### HU-11 · Editar y eliminar comentario propio

**Como** autor de un comentario  
**Quiero** editar o eliminar mis propios comentarios  
**Para** corregir errores en lo que escribí

**Prioridad:** P2

```gherkin
Feature: Editar y eliminar comentario propio

  Scenario: Autor edita su comentario
    Given el comentario C-5 fue creado por "carlos"
    When "carlos" envía una versión actualizada del body
    Then el sistema actualiza el body del comentario

  Scenario: Autor elimina su comentario
    Given el comentario C-5 fue creado por "carlos"
    When "carlos" ejecuta eliminar sobre C-5
    Then el sistema registra deleted_at con timestamp UTC
    And el comentario no aparece en la lista pública

  Scenario: [BORDE] Otro usuario intenta editar comentario ajeno
    Given el comentario C-5 fue creado por "carlos"
    When "diana" intenta editar C-5 via API
    Then el sistema responde con error 403

  Scenario: Admin elimina comentario de otro usuario
    Given el comentario C-5 fue creado por "carlos" en un ticket de "Alpha"
    And "laura" es Admin de "Alpha"
    When "laura" elimina C-5
    Then el sistema registra deleted_at con timestamp UTC
    And el comentario desaparece de la vista

  Scenario: [BORDE] Editar un comentario ya eliminado (soft-deleted)
    Given el comentario C-5 tiene deleted_at definido
    When "carlos" intenta editarlo via API
    Then el sistema responde con error 404
    And no modifica el comentario
```

---

## ÉPICA 5 — Pessimistic Locking

---

### HU-12 · Adquirir bloqueo al abrir modo edición

**Como** usuario que quiere editar un ticket  
**Quiero** que el sistema bloquee el ticket al abrirlo en edición  
**Para** evitar que dos personas editen al mismo tiempo y se pierdan cambios

**Prioridad:** P0

```gherkin
Feature: Pessimistic locking

  Scenario: Primer usuario adquiere el bloqueo
    Given el ticket T-12 no tiene bloqueo activo
    When "carlos" abre T-12 en modo edición
    Then el sistema crea un registro TicketLock: {ticket_id: T-12, locked_by: carlos, locked_at: ahora, expires_at: ahora + 15min}
    And muestra el formulario de edición a "carlos"

  Scenario: Segundo usuario ve el banner de bloqueo
    Given T-12 tiene un bloqueo activo de "carlos" con 8 minutos transcurridos
    When "diana" intenta abrir T-12 en modo edición
    Then el sistema muestra el banner "En edición por Carlos — hace 8 minutos"
    And el formulario de edición está deshabilitado para "diana"

  Scenario: Bloqueo se libera al guardar
    Given "carlos" tiene el bloqueo de T-12
    When guarda los cambios exitosamente
    Then el sistema elimina el registro TicketLock de T-12
    And T-12 queda disponible para edición por otros usuarios

  Scenario: Bloqueo se libera al cancelar
    Given "carlos" tiene el bloqueo de T-12
    When presiona "Cancelar" o cierra el modal
    Then el sistema elimina el registro TicketLock de T-12

  Scenario: [BORDE] Timeout automático de 15 minutos
    Given "carlos" abrió T-12 en modo edición hace 15 minutos sin actividad
    When cualquier usuario consulta el estado del bloqueo de T-12
    Then el sistema evalúa expires_at < ahora
    And considera el bloqueo expirado
    And permite que un nuevo usuario adquiera el bloqueo

  Scenario: [BORDE] Usuario intenta guardar con bloqueo expirado
    Given el bloqueo de "carlos" sobre T-12 expiró mientras editaba
    When "carlos" intenta guardar los cambios
    Then el sistema responde con error 409
    And muestra "Tu sesión de edición expiró. Recarga el ticket para continuar"
    And no persiste ningún cambio parcial

  Scenario: [BORDE] El mismo usuario reabre el ticket que ya tenía bloqueado
    Given "carlos" ya tiene el bloqueo activo de T-12
    When "carlos" vuelve a abrir T-12 en modo edición (por ejemplo, segunda pestaña)
    Then el sistema renueva el expires_at del lock existente
    And no crea un bloqueo duplicado
```

---

## ÉPICA 6 — Filtros y Búsqueda

---

### HU-13 · Filtrar tickets

**Como** cualquier usuario autenticado en un proyecto  
**Quiero** filtrar el listado de tickets por estado, prioridad, etiqueta, asignado y fecha de creación  
**Para** encontrar rápidamente los tickets relevantes

**Prioridad:** P1

```gherkin
Feature: Filtros de tickets

  Scenario: Filtro por un solo criterio
    Given el proyecto "Alpha" tiene 20 tickets en distintos estados
    When el usuario aplica filtro estado = "En progreso"
    Then el listado muestra únicamente los tickets con estado "En progreso"

  Scenario: Filtros combinados (AND)
    Given el proyecto "Alpha" tiene tickets con distintas combinaciones de estado y prioridad
    When el usuario aplica estado = "Por hacer" AND prioridad = "Alta"
    Then el listado muestra únicamente los tickets que cumplen ambas condiciones

  Scenario: Búsqueda por texto en título
    Given existen tickets con títulos que contienen "login" y otros que no
    When el usuario escribe "login" en el campo de búsqueda
    Then el listado muestra únicamente tickets cuyo título contiene "login" (case-insensitive)

  Scenario: [BORDE] Filtros sin resultados
    Given ningún ticket cumple los filtros aplicados
    When el sistema procesa la consulta
    Then muestra un estado vacío con mensaje "No se encontraron tickets con estos filtros"
    And no muestra error

  Scenario: [BORDE] Filtro por asignado combinado con búsqueda de texto
    Given el usuario aplica asignado = "carlos" AND búsqueda = "API"
    When el sistema procesa la consulta
    Then retorna únicamente tickets asignados a "carlos" cuyo título contiene "API"

  Scenario: [BORDE] Filtros aplicados en proyecto archivado
    Given el proyecto "Antiguo" está archivado
    When el usuario accede con el filtro "Archivados" y aplica filtros adicionales
    Then el sistema devuelve los tickets del proyecto archivado que cumplen los filtros
```

---

## ÉPICA 7 — Dashboard de Métricas

---

### HU-14 · Ver dashboard de métricas del proyecto

**Como** cualquier usuario autenticado  
**Quiero** ver un dashboard con métricas del proyecto  
**Para** tener visibilidad del avance y distribución del trabajo

**Prioridad:** P1

```gherkin
Feature: Dashboard de métricas

  Scenario: Tickets cerrados por mes (gráfica de barras)
    Given el proyecto "Alpha" tiene AuditLogs de cambios de estado a "Listo" en múltiples meses
    When el usuario accede al dashboard de "Alpha"
    Then ve una gráfica de barras con el conteo de tickets que llegaron a "Listo" por mes
    And los datos se calculan desde el AuditLog, no desde el campo status actual

  Scenario: Distribución por estado actual (gráfica de dona)
    Given el proyecto "Alpha" tiene tickets activos en distintos estados
    When el usuario ve el dashboard
    Then la gráfica muestra la proporción de tickets en "Por hacer", "En progreso" y "Listo"

  Scenario: Distribución por prioridad
    Given el proyecto "Alpha" tiene tickets con distintas prioridades
    When el usuario ve el dashboard
    Then la gráfica muestra la proporción de tickets por prioridad Alta / Media / Baja

  Scenario: [BORDE] Proyecto sin tickets
    Given el proyecto "Nuevo" no tiene ningún ticket creado
    When el usuario accede al dashboard
    Then las gráficas muestran estado vacío con cero en todos los conteos
    And no se produce error de división por cero

  Scenario: [BORDE] Ticket movido a "Listo" y luego regresado a "En progreso"
    Given el ticket T-50 fue marcado como "Listo" en marzo y luego regresado a "En progreso"
    When el dashboard calcula tickets cerrados por mes
    Then T-50 se contabiliza en el mes de marzo (momento en que llegó a "Listo")
    And también refleja el estado actual "En progreso" en la distribución por estado
```

---

## ÉPICA 8 — Notificaciones por Email

---

### HU-15 · Notificación al ser asignado a un ticket

**Como** usuario  
**Quiero** recibir un email cuando me asignan a un ticket  
**Para** enterarme de manera inmediata sin tener que revisar la herramienta

**Prioridad:** P2

```gherkin
Feature: Notificación de asignación

  Scenario: Email enviado al asignado
    Given "diana" está registrada con email "diana@empresa.com"
    When un Admin asigna a "diana" al ticket T-20 del proyecto "Alpha"
    Then el sistema encola un email hacia "diana@empresa.com"
    And el email incluye el nombre del ticket, el proyecto y un enlace al ticket

  Scenario: Múltiples asignados — todos reciben email
    Given T-20 no tiene asignados
    When el Admin asigna a "carlos" y "diana" simultáneamente
    Then el sistema encola un email independiente para cada uno

  Scenario: [BORDE] Fallo en el servicio de email
    Given el servicio de email (Resend) retorna error 5xx
    When el sistema intenta enviar la notificación de asignación
    Then el error se registra en los logs del servidor
    And la asignación en base de datos se mantiene (no se revierte)
    And el sistema no bloquea la respuesta al cliente por el fallo de email
```

---

### HU-16 · Notificación por mención en comentario

**Como** usuario  
**Quiero** recibir un email cuando me mencionan con @mi_usuario en un comentario  
**Para** no perder conversaciones importantes

**Prioridad:** P2

```gherkin
Feature: Notificación por mención

  Scenario: Mención válida en comentario
    Given "carlos" está registrado en el sistema con handle "@carlos"
    When alguien escribe un comentario que incluye "@carlos" en el ticket T-12
    Then el sistema detecta la mención
    And encola un email a "carlos" con el contenido del comentario y enlace al ticket

  Scenario: [BORDE] Mención a usuario que no existe en el sistema
    Given no existe un usuario con handle "@fantasma"
    When alguien escribe "@fantasma" en un comentario
    Then el sistema persiste el comentario normalmente
    And no envía ningún email ni produce error

  Scenario: [BORDE] Auto-mención
    Given "carlos" escribe un comentario mencionándose a sí mismo "@carlos"
    When el sistema procesa el comentario
    Then no envía el email de notificación a "carlos" (no se notifica a uno mismo)

  Scenario: [BORDE] Múltiples menciones en un mismo comentario
    Given el comentario contiene "@carlos @diana @luis"
    When el sistema procesa las menciones
    Then encola un email independiente para cada usuario mencionado
    And no genera emails duplicados si el mismo usuario es mencionado dos veces
```

---

## Resumen de Historias de Usuario

| ID | Historia | Épica | Prioridad |
|---|---|---|---|
| HU-01 | Login con usuario y contraseña | Auth | P0 |
| HU-02 | Control de roles por proyecto | Auth | P0 |
| HU-03 | Crear proyecto | Proyectos | P1 |
| HU-04 | Archivar proyecto | Proyectos | P1 |
| HU-05 | Crear ticket | Tickets | P0 |
| HU-06 | Editar ticket | Tickets | P0 |
| HU-07 | Cambiar estado de ticket | Tickets | P0 |
| HU-08 | Archivar ticket | Tickets | P1 |
| HU-09 | Asignar y reasignar usuarios | Tickets | P1 |
| HU-10 | Agregar comentario | Comentarios | P1 |
| HU-11 | Editar y eliminar comentario propio | Comentarios | P2 |
| HU-12 | Pessimistic locking | Concurrencia | P0 |
| HU-13 | Filtrar tickets | Filtros | P1 |
| HU-14 | Dashboard de métricas | Métricas | P1 |
| HU-15 | Notificación al ser asignado | Email | P2 |
| HU-16 | Notificación por mención | Email | P2 |

**P0 (bloqueantes MVP):** HU-01, HU-02, HU-05, HU-06, HU-07, HU-12 — 6 historias  
**P1 (core MVP):** HU-03, HU-04, HU-08, HU-09, HU-10, HU-13, HU-14 — 7 historias  
**P2 (complementan MVP):** HU-11, HU-15, HU-16 — 3 historias
