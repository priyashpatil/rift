---
title: "Node.js — Next.js, NestJS, Vite, Express"
description: "Step-by-step guide to running Node.js projects across multiple Rift worktrees with isolated ports and databases."
weight: 3
---

Before you begin, complete the [Getting Started](/guides/getting-started/) guide and familiarize yourself with the [bootstrap pattern](/hooks/#the-bootstrap-pattern).

---

## Step 1: Create .env.example

Commit a `.env.example` with every variable your project needs. This is the template the bootstrap script will copy and customize per worktree:

```
PORT=3000
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=myapp
```

Add more variables as needed — `API_PORT`, `REDIS_PORT`, etc. Add `.env` to `.gitignore`.

## Step 2: Create the bootstrap script

This script runs on every `rift open` and `rift jump`. It copies `.env.example` to `.env`, derives a deterministic port from the worktree name (so the same worktree always gets the same port), and sets a worktree-specific database name. See [The Bootstrap Pattern](/hooks/#the-bootstrap-pattern) for how the hash formula works.

Add a bootstrap script to `package.json`:

```json
{
  "scripts": {
    "bootstrap": "node scripts/bootstrap.mjs"
  }
}
```

Create `scripts/bootstrap.mjs`:

```javascript
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";

const worktree = process.env.RIFT_WORKTREE;

// Derive a deterministic base port (range 3000–9999)
const hash = createHash("sha1").update(worktree).digest("hex").replace(/[a-f]/g, "").slice(0, 4);
const port = (Number(hash) % 7000) + 3000;

// Derive a worktree-specific database name
const dbName = `myapp_${worktree.replace(/-/g, "_")}`;

// Write .env from template, override PORT and DB_NAME
let env = readFileSync(".env.example", "utf-8");
env = env.replace(/^PORT=.*/m, `PORT=${port}`);
env = env.replace(/^DB_NAME=.*/m, `DB_NAME=${dbName}`);
writeFileSync(".env", env);

console.log(`Worktree '${worktree}': port=${port}, db=${dbName}`);
```

> **Prisma users:** `npx prisma db push` creates the database automatically. For Drizzle, Knex, and other ORMs that don't, add database creation to the script — see [Creating the database](#creating-the-database) below.

### Avoiding port collisions across services

Most projects run more than one service — an app server, a database, a cache. Each one binds a port, and every worktree needs its own set. Add more port variables derived from the same base so nothing collides. See [multiple ports](/hooks/#multiple-ports) for details.

Add the extra variables to `.env.example`:

```
PORT=3000
API_PORT=3001
DB_PORT=5432
REDIS_PORT=6379
```

And to `scripts/bootstrap.mjs`, add more replacements:

```javascript
env = env.replace(/^API_PORT=.*/m, `API_PORT=${port + 1}`);
env = env.replace(/^DB_PORT=.*/m, `DB_PORT=${port + 2}`);
env = env.replace(/^REDIS_PORT=.*/m, `REDIS_PORT=${port + 3}`);
```

### Creating the database

If your ORM doesn't auto-create the database (Drizzle, Knex), add this to the end of `scripts/bootstrap.mjs`:

**PostgreSQL** (using the `pg` package):

```javascript
import pg from "pg";

const client = new pg.Client({
  host: "localhost",
  user: "postgres",
  password: "postgres",
  database: "postgres", // connect to default db first
});
await client.connect();
const res = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
if (res.rowCount === 0) {
  await client.query(`CREATE DATABASE "${dbName}"`);
}
await client.end();
```

**MySQL** (using the `mysql2` package):

```javascript
import mysql from "mysql2/promise";

const conn = await mysql.createConnection({ host: "localhost", user: "root" });
await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
await conn.end();
```

### Bash alternative

If you prefer a shell script, create `scripts/bootstrap.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

hash=$(echo -n "$RIFT_WORKTREE" | shasum | tr -d 'a-f ' | cut -c1-4)
BASE=$(( (hash % 7000) + 3000 ))
DB_NAME="myapp_$(echo "$RIFT_WORKTREE" | tr '-' '_')"

sed -e "s/^PORT=.*/PORT=$BASE/" \
    -e "s/^DB_NAME=.*/DB_NAME=$DB_NAME/" \
    .env.example > .env

echo "Worktree '$RIFT_WORKTREE': port=$BASE, db=$DB_NAME"
```

## Step 3: Configure your dev server

Configure your framework to read `PORT` from `.env`. The bootstrap script already wrote it there.

### Next.js

Next.js reads `PORT` from `.env` automatically. No code changes needed:

```bash
npm run dev
```

### NestJS

NestJS doesn't read `.env` for the listen port by default. Update `src/main.ts`:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

If you're using `@nestjs/config`, `process.env.PORT` is already available after `ConfigModule` loads.

### Vite

Vite doesn't read `PORT` for `server.port` by default. Use the `--port` flag in your dev script:

```json
{
  "scripts": {
    "dev": "vite --port ${PORT:-3000}"
  }
}
```

Or update `vite.config.ts`:

```typescript
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 3000,
  },
});
```

### Express / generic Node.js

```javascript
require("dotenv").config();

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

## Step 4: Configure your database

The bootstrap script already writes `DB_NAME` to `.env`. Configure your ORM to read it.

### Prisma

Update `.env.example` to use `DB_NAME`:

```
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}
```

Or keep a full URL and have the bootstrap script replace the database name directly.

Prisma's `db push` **creates the database automatically** — no database creation needed in the bootstrap.

### Drizzle

Configure your `drizzle.config.ts` to read `DB_NAME` from the environment. Drizzle does **not** create the database — the bootstrap script's database creation step (see [Creating the database](#creating-the-database)) handles that.

### Knex

Configure `knexfile.js` to read `DB_NAME` from the environment. Knex does **not** create the database — the bootstrap script's database creation step handles that.

### SQLite

SQLite databases are just files. Since each worktree is its own directory, `./dev.db` is already unique per worktree — no `DB_NAME` override needed. You can simplify the bootstrap to skip the database lines.

## Step 5: Wire up rift.yaml

Add hooks to `rift.yaml` so the bootstrap runs automatically on worktree lifecycle events:

**Prisma:**

```yaml
hooks:
  open: "npm run bootstrap && npm install && npx prisma db push"
  jump: "npm run bootstrap"
  close: "npx prisma db push --force-reset"
```

**Drizzle:**

```yaml
hooks:
  open: "npm run bootstrap && npm install && npx drizzle-kit migrate"
  jump: "npm run bootstrap"
```

**Knex:**

```yaml
hooks:
  open: "npm run bootstrap && npm install && npx knex migrate:latest"
  jump: "npm run bootstrap"
```

Add seeding to `open` if needed:

```yaml
hooks:
  open: "npm run bootstrap && npm install && npx prisma db push && npm run seed"
```

### With Docker Compose

If your services run in Docker Compose, add container lifecycle commands. See the [Docker Compose guide](/guides/docker-compose/) for full details.

```yaml
hooks:
  open: "npm run bootstrap && npm install && docker compose up -d && npx prisma db push"
  jump: "npm run bootstrap"
  close: "docker compose down"
  purge: "docker compose down -v"
```

## Cleanup

When a worktree is closed, its database lingers on the shared server. Use the `close` hook to drop it:

| ORM | Drop command |
|---|---|
| Prisma | `npx prisma db push --force-reset` |
| Drizzle | `npx drizzle-kit drop` |
| Knex | `npx knex migrate:rollback --all` |
