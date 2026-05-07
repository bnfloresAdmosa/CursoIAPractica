---
name: Validar antes de aplicar prompts del curso que alteran trabajo previo
description: Cuando un prompt del curso descarta dependencias, borra archivos, sube versiones mayores o anula decisiones previas, pausar y pedir confirmación explícita antes de ejecutar.
type: feedback
---

El usuario está siguiendo un curso con prompts secuenciales. Algunos prompts entran en conflicto con avances/decisiones previas (CLAUDE.md, scaffold ya construido, deps instaladas, etc.).

**Regla:** Antes de ejecutar un prompt del curso que tenga **alto impacto** sobre lo ya hecho, pausar y validar con el usuario.

**¿Qué cuenta como alto impacto?**
- Borrar carpetas o archivos existentes (ej: wipe de `frontend/` o `backend/`)
- Bajar/quitar dependencias instaladas (ej: remover Tailwind, React Query, Zustand)
- Subir versiones mayores (ej: React 18 → 19, Vite 5 → 6)
- Anular decisiones registradas en CLAUDE.md o memorias
- Reescribir archivos extensos en vez de editar quirúrgicamente

**¿Qué NO cuenta?**
- Agregar archivos nuevos en carpetas vacías
- Implementar features que CLAUDE.md ya tenía planeadas
- Edits acotados a un archivo

**Cómo validar:**
1. Resumir en bullets cortos qué se va a destruir/cambiar y qué quedaría intacto.
2. Listar las divergencias específicas con CLAUDE.md o el scaffold actual.
3. Esperar confirmación explícita ("ok procede" / "sí" / "adelante") antes de ejecutar.
4. Si el prompt se puede satisfacer con edits incrementales en vez de wipe + rebuild, proponer esa alternativa primero.

**Why:** El 6 de mayo 2026, ante el prompt "crea el proyecto React" que contradecía CLAUDE.md (sin Tailwind, React 19), procedí a borrar `frontend/` completo y reconstruir, en lugar de modificar lo existente. El usuario lo señaló: "solo hay que ir modificando lo necesario".

**How to apply:** Aplica a TODOS los prompts del curso en el proyecto Mini Jira (`CursoIAPractica/`). Por defecto, preferir edits quirúrgicos sobre rewrites. Cuando el costo del análisis impida certeza, preguntar antes de actuar.
