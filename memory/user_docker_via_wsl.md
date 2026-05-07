---
name: Docker se invoca con `wsl docker` en la máquina del usuario
description: En Windows del usuario, Docker está instalado dentro de WSL (no Docker Desktop). Cualquier comando `docker` desde PowerShell debe ir prefijado con `wsl `.
type: user
---

En el laptop Windows del usuario, Docker corre **dentro de WSL**, no como Docker Desktop integrado.

**How to use:** Cuando escribas comandos `docker` para que el usuario los ejecute en PowerShell, prefíjalos con `wsl `:
- `wsl docker ps`
- `wsl docker compose up -d`
- `wsl docker exec -it <container> <cmd>`
- `wsl docker logs <container>`

Las llamadas directas (`docker ps`) no funcionan en su PowerShell. El usuario lo confirmó explícitamente: "yo lo hago así: wsl docker ps, porque así lo tengo configurado en mi windows".

Aplica a todos los proyectos del usuario, no solo Mini Jira.
