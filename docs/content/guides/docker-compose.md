---
title: "Docker Compose with Worktrees"
description: "Isolate containerized services across worktrees with unique host ports."
weight: 9
---

## The problem

Docker Compose maps container ports to host ports. When multiple worktrees run `docker compose up`, every instance tries to bind the same host ports — only the first one succeeds.

## How Docker Compose reads .env

Docker Compose automatically loads a `.env` file from the **working directory** where you run it. Since each Rift worktree is its own directory, each worktree gets its own `.env` — no extra configuration needed.

## Setup

### docker-compose.yml

Use `${VAR:-default}` syntax so the file works both with and without a `.env`:

```yaml
services:
  app:
    build: .
    ports:
      - "${PORT:-3000}:3000"

  db:
    image: postgres:16
    ports:
      - "${DB_PORT:-5432}:5432"
    environment:
      POSTGRES_PASSWORD: postgres

  redis:
    image: redis:7
    ports:
      - "${REDIS_PORT:-6379}:6379"
```

The left side of each port mapping (the host port) is the one that must be unique. The right side (the container port) stays the same — your application code always connects to the standard port inside the container.

### bootstrap.sh

`rift init` can generate a bootstrap script for you, or you can use any custom command. Here's the [multiple ports variant](/hooks/#multiple-ports) to generate a `.env` with all the ports your services need:

```bash
#!/usr/bin/env bash
set -euo pipefail

hash=$(echo -n "$RIFT_WORKTREE" | shasum | tr -d 'a-f ' | cut -c1-4)
BASE=$(( (hash % 7000) + 3000 ))

cat > .env <<EOF
PORT=$BASE
DB_PORT=$(( BASE + 1 ))
REDIS_PORT=$(( BASE + 2 ))
EOF

echo "Assigned ports $BASE, $(( BASE + 1 )), $(( BASE + 2 )) for worktree '$RIFT_WORKTREE'"
```

### rift.yaml

`rift init` can set up the bootstrap hooks for you. For Docker Compose projects, you'll likely want to extend the hooks with container lifecycle commands:

```yaml
hooks:
  open: "bash scripts/bootstrap.sh && docker compose up -d"
  jump: "bash scripts/bootstrap.sh"
  close: "docker compose down"
  purge: "docker compose down -v"
```

The bootstrap command can be anything — `bash scripts/bootstrap.sh`, `npm run bootstrap`, etc. See [Hooks](/hooks/#the-bootstrap-pattern) for details.

- **open** — generate ports, then start containers in the background.
- **jump** — regenerate `.env` (containers keep running from the previous session).
- **close** — stop and remove containers.
- **purge** — stop containers and remove volumes (full cleanup).

## Container naming

Docker Compose derives the project name from the directory name. Since each worktree lives in its own directory (e.g. `bold-ant`), containers are automatically namespaced:

```
bold-ant-app-1
bold-ant-db-1
bold-ant-redis-1
```

No `COMPOSE_PROJECT_NAME` override is needed.

## Internal vs external ports

The host port (external) changes per worktree. The container port (internal) stays the same.

```
Host (unique per worktree)     Container (always the same)
        4521  ──────────────►  3000   (app)
        4522  ──────────────►  5432   (postgres)
        4523  ──────────────►  6379   (redis)
```

Your application code inside the container always connects to `localhost:5432` for Postgres, `localhost:6379` for Redis, etc. Only external access (your browser, API clients) uses the worktree-specific port.

## Accessing services

To check which ports a worktree is using:

```bash
cat .env
```

Or ask Docker directly:

```bash
docker compose ps
```

## Cleanup

The `close` and `purge` hooks handle teardown automatically. If a worktree is removed manually (e.g. by deleting the directory), its containers may be left running. Clean them up with:

```bash
docker compose -p <worktree-name> down -v
```

Or remove all stopped containers:

```bash
docker container prune
```
