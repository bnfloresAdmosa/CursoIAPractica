# Plan de Clase: Desarrollo Orientado a Especificaciones (SDD) con IA


---

## 🧱 Bloque 1: El Fin del "Vibe Coding" y la Ingesta de Contexto — 25 min

**Objetivo:** Transformar la ambigüedad de los stakeholders en un Product Requirements Document (PRD) estricto usando Gemini, mitigando alucinaciones desde el día 1.

### Teoría (Problem-First)

- **El Problema:** Muestra un prompt ingenuo: _"Crea un Jira en React"_. Explica que esto es "Vibe Coding". Las IAs priorizan darte una respuesta sobre darte la respuesta correcta, inventando reglas de negocio, lo que genera deuda técnica instantánea.
- **La Solución:** El Desarrollo Orientado a Especificaciones (SDD) eleva la especificación a "código ejecutable". Dar un contexto claro a un LLM logra más de un 95% de precisión en el primer intento y reduce defectos hasta en un 80%.
- **Gestión de Contexto:** Usaremos Gemini por su ventana masiva de tokens. Inculcaremos el patrón **"Document & Clear"**: generar el artefacto, guardarlo y limpiar el chat para no saturar la memoria de la IA.

### 🛠️ Actividad — Paso a Paso

1. **Ingesta:** Entrega a los alumnos el archivo `reunion_mini_jira.txt` (transcripción simulada con requerimientos vagos).
2. **Prompting Socrático:** En Gemini, ingresar:
   > _"Actúa como un PM Senior. Analiza esta transcripción. Hazme 3 preguntas críticas y exhaustivas sobre roles, concurrencia o borrado lógico que los stakeholders omitieron."_
3. **Refinamiento:** Los alumnos deben responder tomando las decisiones de diseño (ej. definiendo que el borrado será lógico).
4. **Generación:** Prompt final:
   > _"Basado en mis respuestas, genera el PRD definitivo (specs.md). Incluye Objetivos, In-Scope, Out-Scope y Stack Tecnológico."_
5. **Limpieza:** Guardar `specs.md` localmente y limpiar la sesión de Gemini.

---

## 🧱 Bloque 2: Comportamiento y BDD (Behavior Driven Development) — 20 min

**Objetivo:** Traducir el PRD a historias de usuario ejecutables mediante sintaxis Gherkin.

### Teoría (Problem-First)

- **El Problema:** Las tareas técnicas (ej. _"Crear base de datos de tickets"_) no explican el valor de negocio ni cómo probarlo.
- **La Solución:** La sintaxis **Gherkin** (`Given / When / Then`) funciona como un puente universal. Es el formato que mejor entienden tanto los stakeholders de negocio como los agentes de IA que luego programarán y probarán la aplicación.

### 🛠️ Actividad — Paso a Paso

1. **Anclaje:** Inicia un nuevo chat en Gemini adjuntando **exclusivamente** el `specs.md`.
2. **Prompt de Historias:**
   > _"Actúa como QA Lead. Basado en el PRD, redacta las 3 Historias de Usuario críticas para el MVP del Mini JIRA. Usa estrictamente sintaxis Gherkin (Given/When/Then) para los Criterios de Aceptación."_
3. **Revisión:** Verifica que las historias describan el _qué_ y no el _cómo_ (criterios declarativos, no imperativos).
4. **Guardado:** Exportar el resultado y guardarlo como `backlog.md`.

---

## 🧱 Bloque 3: AI Shift-Left Testing y Casos Límite — 20 min

**Objetivo:** Crear una estrategia de validación proactiva y descubrir Edge Cases antes de que exista el código.

### Teoría (Problem-First)

- **El Problema:** Dejar el QA para el final del ciclo significa que los errores arquitectónicos cuestan 100 veces más repararlos. Los humanos solemos diseñar pensando solo en el _"Happy Path"_ (camino feliz).
- **La Solución:** **Shift-Left Testing**. La IA tiene la capacidad de inferir cientos de combinaciones de fallos (entradas masivas, red caída) analizando lenguaje natural. Pediremos a la IA que deduzca qué puede salir mal y priorice los riesgos.

### 🛠️ Actividad — Paso a Paso

1. **Contexto Dual:** En el mismo chat, teniendo `specs.md` y `backlog.md` en contexto.
2. **Prompt de QA:**
   > _"Actúa como un QA Lead Senior. Lee las especificaciones y genera un Plan de Pruebas. Identifica y redacta 5 'Edge Cases' (Casos Límite) críticos que puedan romper la lógica del tablero Kanban o los roles. Priorízalos por impacto de negocio."_
3. **Guardado:** Revisar cómo la IA descubrió escenarios no planeados (ej. ¿qué pasa si dos usuarios mueven el mismo ticket a la vez?). Guardar como `test_plan.md`. Limpiar el chat.

---

## 🧱 Bloque 4: Diagrams as Code y ADRs — 25 min

**Objetivo:** Generar el diseño de alto y bajo nivel (HLD/LLD) y aprender a auditar decisiones arquitectónicas (ADRs).

### Teoría (Problem-First)

- **El Problema:** Diagramas pesados en XML (como draw.io) consumen hasta 1,200 tokens de contexto y vuelven locos a los LLMs.
- **La Solución:** **Mermaid.js**. Un diagrama en Mermaid consume solo ~50 tokens. Es "AI-friendly" y controlable mediante Git.
  > **Nota:** Advierte que el "cruce de líneas" es un mal necesario por el layout automático — es el precio de la eficiencia.
- **Gobernanza:** Las decisiones se olvidan. Usaremos **ADRs** para tener Event Sourcing de las decisiones, documentando el _"por qué"_ de la arquitectura.

### 🛠️ Actividad — Paso a Paso

1. **Diagramación:** Con `specs.md` en un chat nuevo, ingresar:
   > _"Actúa como Arquitecto de Software. Genera un modelo C4 a nivel de contenedores para el Mini Jira usando sintaxis estricta Mermaid.js."_
2. **Visualización:** Copiar el código y pegarlo en `mermaid.live` o usar la extensión de VS Code para visualizarlo. Guardar en `architecture.mermaid`.
3. **Prompt ADR:**
   > _"Redacta un documento ADR (Architecture Decision Record) en Markdown detallando la decisión de usar Base de Datos Relacional para este MVP. Incluye: Contexto, Opciones evaluadas, Decisión y Consecuencias."_
4. **Guardado:** Guardar como `001-database-selection.md`.

---

## 🧱 Bloque 5: Diseño Schema-First y Mock Data — 15 min

**Objetivo:** Construir el contrato de la capa de datos.

### Teoría (Problem-First)

- **El Problema:** Dejar que el agente de IA cree la base de datos "sobre la marcha" mientras hace el backend genera esquemas desordenados y sin integridad.
- **La Solución:** **Schema-First**. La base de datos es el cimiento. Si le damos a la futura IA (Claude Code) un esquema ya definido, el backend que genere será perfecto. Además, la IA es excelente generando datos "Semilla" realistas.

### 🛠️ Actividad — Paso a Paso

1. **Prompt DDL:**
   > _"Genera un script DDL para PostgreSQL (init_db.sql). Crea las tablas para Usuarios y Tickets asegurando constraints, foreign keys y timestamps por defecto."_
2. **Prompt Datos:**
   > _"Añade al script sentencias INSERT para poblar la base de datos con Mock Data realista: 3 usuarios simulados y 5 tickets en diversos estados (To-Do, In-Progress, Done)."_
3. **Guardado:** Guardar el script como `init_db.sql`.

---

## 🧱 Bloque 6: Prototipado Rápido con Google Stitch — 20 min

**Objetivo:** Validar visualmente la interfaz de usuario en minutos generando una pantalla estática usando Google Stitch.

### Teoría (Problem-First)

- **El Problema:** Empezar a programar el backend y la lógica de la UI sin haber validado el "Look and Feel" con el cliente resulta en horas de trabajo desperdiciado.
- **La Solución:** **Generadores Frontend vs Orquestadores**. Usaremos Google Stitch (Labs), una herramienta alimentada por Gemini 3 Pro/Flash especializada en generar vistas UI estáticas y código React/Tailwind rápidamente a partir de texto. Es ideal para validar una pantalla única y congelar el diseño.

### 🛠️ Actividad — Paso a Paso

1. **Entorno:** Pedir a los alumnos que abran Google Stitch en su navegador.
2. **Configuración:** Asegurarse de que el modelo base seleccionado sea **Gemini 3 Pro** (para mayor fidelidad estructural).
3. **Prompt de Interfaz:** Pegar un resumen del `specs.md` e ingresar:
   > _"Genera únicamente la vista principal estática (Dashboard) del Mini JIRA en React y Tailwind. Muestra un layout limpio con un tablero Kanban conteniendo las columnas To-Do, In Progress y Done, pobladas con datos de ejemplo usando tonos slate y azules."_
4. **Validación y Hand-off:** Evaluar la vista generada, iterar con pequeños prompts de diseño en el chat de Stitch (ej. _"haz las tarjetas más redondeadas"_) y exportar el código final guardándolo como `prototype.tsx`.

---

## 🧱 Bloque 7: El Hand-off al Desarrollo — 10 min

**Objetivo:** Auditar los entregables y cerrar la fase de diseño.

### Teoría

El trabajo de hoy no fue "escribir documentación muerta", sino crear el **sistema de control y gobierno para los Agentes IA**. En la próxima lección (Módulo 4), herramientas de ejecución como Claude Code leerán todos estos archivos dentro del IDE para generar el sistema final sin intervención humana manual excesiva y libre de alucinaciones.

### ✅ Checklist Final — 6 Artefactos Clave

Verificar que la carpeta de proyecto contenga:

- [ ] `specs.md` — Contrato maestro
- [ ] `backlog.md` — Historias ejecutables BDD
- [ ] `test_plan.md` — Estrategia QA y Edge Cases
- [ ] `architecture.mermaid` — Topología visual
- [ ] `init_db.sql` — Cimientos de datos
- [ ] `prototype.tsx` — Validación visual UI de Google Stitch

> **Cierre:** Realizar el primer commit a Git. Fin de la lección.
