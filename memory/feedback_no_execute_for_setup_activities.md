---
name: Para actividades de testing y dockerización (setup), no ejecutar comandos — sólo crear archivos
description: A partir de las actividades de testing y dockerización en adelante, NO correr install/exec; sólo escribir archivos de configuración. Asumir que las deps fueron instaladas, sin documentar el setup en los archivos.
type: feedback
---

A partir de las actividades de **testing y dockerización** del proyecto Mini Jira (`CursoIAPractica/`), el usuario maneja los `pnpm install` / `docker build` / etc. por su cuenta.

**Regla:**
- **NO ejecutar** comandos de instalación, build, ni runtime: `pnpm install`, `pnpm add`, `pnpm test`, `pnpm exec`, `docker build`, `docker compose up`, `prisma migrate`, `tsx`, etc.
- **NO ejecutar** comandos de verificación (typecheck, lint, smoke tests). El usuario verifica después de instalar.
- **SÍ crear** archivos de configuración (`vitest.config.ts`, `playwright.config.ts`, `Dockerfile`, `docker-compose.yml`, `.dockerignore`, etc.).
- **SÍ crear** archivos de código (tests `.test.ts`, fixtures, mocks).
- **NO escribir disclaimers** en los archivos como "esto requiere `pnpm add X`" o "asegúrate de instalar Y antes". Asumir que las deps ya están y referenciar imports/scripts como si todo funcionara.
- **SÍ documentar al usuario en el chat** qué dependencias hay que instalar (un bullet limpio al final), pero sin meterlo en el código.

**Why:** El 7 de mayo 2026 el usuario indicó textualmente: "con las siguientes actividades que te de si es de instalar o ejecutar algo, no lo hagas, solo crea los archivos de configuracion, pero no documentos que no instalamos, asumamos que si se hizo." Quiere control sobre cuándo se instala/ejecuta — yo me dedico a generar configs y código, él orquesta.

**How to apply:**
- Cuando llegue un prompt de testing (vitest, playwright, supertest) o dockerización (Dockerfile, compose, CI), saltarse `pnpm add ...` y `docker build ...`.
- Listar al final del mensaje qué tiene que correr el usuario: una sección "Para activarlo, ejecuta:" con los comandos exactos.
- El typecheck/lint que YO solía correr post-cambios para validar — ya no se hace en estas actividades. Confío en TS para que mi código compile y el usuario lo verifica.
- Si el usuario me reasigna explícitamente "ahora sí instala/ejecuta X" para una actividad, sigo esa instrucción puntual sin generalizar.
