---
title: "Database Isolation per Worktree"
description: "Create a dedicated database for each worktree so parallel branches don't corrupt shared state."
weight: 8
---

## The problem

Service hosts like PostgreSQL, MySQL, and Redis can be shared across worktrees — you don't need a separate server instance per worktree. But when two worktrees run migrations against the same **logical database**, they corrupt each other's schema. When two branches write test data, they pollute each other's state.

The server is shared. The database is not. Each worktree needs its own database within the shared server.

## The pattern

Most projects already follow a standard `.env` pattern for local development:

1. A committed `.env.example` holds shared local defaults (host, user, password).
2. Each developer copies it to `.env` and never commits `.env`.

Rift extends this. The bootstrap hook copies `.env.example` to `.env` and overrides `DB_NAME` with a worktree-specific value derived from `RIFT_WORKTREE`. Credentials stay in `.env.example` where they belong — the hook only changes the database name.

```
.env.example (committed)          .env (generated per worktree)
─────────────────────────          ─────────────────────────────
DB_HOST=localhost                  DB_HOST=localhost
DB_USER=postgres                   DB_USER=postgres
DB_PASSWORD=postgres               DB_PASSWORD=postgres
DB_NAME=myapp                      DB_NAME=myapp_bold_ant
PORT=3000                          PORT=4521
```

No credentials in hook scripts. No database passwords in `rift.yaml`.

## Node.js

Add a bootstrap script to `package.json`:

```json
{
  "scripts": {
    "bootstrap": "node scripts/bootstrap.mjs"
  }
}
```

```javascript
// scripts/bootstrap.mjs
import { readFileSync, writeFileSync } from "fs";

const worktree = process.env.RIFT_WORKTREE;
const dbName = `myapp_${worktree.replace(/-/g, "_")}`;

// Start from .env.example, override DB_NAME
let env = readFileSync(".env.example", "utf-8");
env = env.replace(/^DB_NAME=.*/m, `DB_NAME=${dbName}`);
writeFileSync(".env", env);

console.log(`Database: ${dbName}`);
```

Then use your ORM's tooling to create the database and run migrations:

**Prisma:**

```yaml
hooks:
  open: "npm run bootstrap && npx prisma db push"
  jump: "npm run bootstrap"
```

Prisma reads `DATABASE_URL` from `.env`. Update `.env.example` to use the `DB_NAME` variable:

```
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}
```

Or keep a full URL and have the bootstrap script replace the database name in it directly.

**Drizzle:**

```yaml
hooks:
  open: "npm run bootstrap && npx drizzle-kit migrate"
  jump: "npm run bootstrap"
```

**Knex:**

```yaml
hooks:
  open: "npm run bootstrap && npx knex migrate:latest"
  jump: "npm run bootstrap"
```

## Laravel

Laravel already reads `.env` for all database config. The bootstrap just needs to set the database name:

```yaml
hooks:
  open: "php scripts/bootstrap.php && php artisan migrate --force"
  jump: "php scripts/bootstrap.php"
```

```php
<?php
// scripts/bootstrap.php
$worktree = getenv('RIFT_WORKTREE');
$dbName = 'myapp_' . str_replace('-', '_', $worktree);

$env = file_get_contents('.env.example');
$env = preg_replace('/^DB_DATABASE=.*/m', "DB_DATABASE=$dbName", $env);
file_put_contents('.env', $env);

echo "Database: $dbName\n";
```

Your `.env.example` already has the standard Laravel database variables:

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=myapp
DB_USERNAME=root
DB_PASSWORD=
```

`php artisan migrate` creates the database automatically if it doesn't exist (Laravel 9+).

## Symfony

```yaml
hooks:
  open: "php scripts/bootstrap.php && php bin/console doctrine:database:create --if-not-exists && php bin/console doctrine:migrations:migrate --no-interaction"
  jump: "php scripts/bootstrap.php"
```

Symfony's DotEnv component loads `.env` automatically. The `.env.example` (or `.env` in Symfony's convention) uses `DATABASE_URL`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myapp
```

The bootstrap script replaces the database name in the URL:

```php
<?php
$worktree = getenv('RIFT_WORKTREE');
$dbName = 'myapp_' . str_replace('-', '_', $worktree);

$env = file_get_contents('.env.example');
$env = preg_replace('#/myapp$#m', "/$dbName", $env);
file_put_contents('.env', $env);

echo "Database: $dbName\n";
```

## Django

```yaml
hooks:
  open: "python scripts/bootstrap.py && python manage.py migrate"
  jump: "python scripts/bootstrap.py"
```

```python
# scripts/bootstrap.py
import os, re

worktree = os.environ["RIFT_WORKTREE"]
db_name = f"myapp_{worktree.replace('-', '_')}"

with open(".env.example") as f:
    env = f.read()

env = re.sub(r"^DB_NAME=.*", f"DB_NAME={db_name}", env, flags=re.MULTILINE)

with open(".env", "w") as f:
    f.write(env)

print(f"Database: {db_name}")
```

Your `.env.example`:

```
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=myapp
DB_PORT=5432
```

And in `settings.py`:

```python
from dotenv import load_dotenv
load_dotenv()

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("DB_NAME", "myapp"),
        "USER": os.environ.get("DB_USER", "postgres"),
        "PASSWORD": os.environ.get("DB_PASSWORD", "postgres"),
        "HOST": os.environ.get("DB_HOST", "localhost"),
        "PORT": os.environ.get("DB_PORT", "5432"),
    }
}
```

`python manage.py migrate` will create tables in the worktree-specific database. To create the database itself, add `python manage.py dbshell -- -c "CREATE DATABASE IF NOT EXISTS ..."` before migrate, or use [`django-extensions`](https://django-extensions.readthedocs.io/) which provides `manage.py create_db`.

## Flask / FastAPI

The same Python bootstrap script works. Use your ORM's CLI:

**Flask-Migrate (Alembic):**

```yaml
hooks:
  open: "python scripts/bootstrap.py && flask db upgrade"
  jump: "python scripts/bootstrap.py"
```

**FastAPI with Alembic:**

```yaml
hooks:
  open: "python scripts/bootstrap.py && alembic upgrade head"
  jump: "python scripts/bootstrap.py"
```

## Rails

Rails reads `DATABASE_URL` or `config/database.yml` from the environment. The bootstrap script writes the database name to `.env`:

```yaml
hooks:
  open: "ruby scripts/bootstrap.rb && bin/rails db:prepare"
  jump: "ruby scripts/bootstrap.rb"
```

```ruby
# scripts/bootstrap.rb
worktree = ENV.fetch("RIFT_WORKTREE")
db_name = "myapp_#{worktree.tr('-', '_')}"

env = File.read(".env.example")
env.sub!(/^DB_NAME=.*/, "DB_NAME=#{db_name}")
File.write(".env", env)

puts "Database: #{db_name}"
```

Your `.env.example`:

```
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=myapp
```

And in `config/database.yml`:

```yaml
development:
  adapter: postgresql
  host: <%= ENV.fetch("DB_HOST", "localhost") %>
  username: <%= ENV.fetch("DB_USER", "postgres") %>
  password: <%= ENV.fetch("DB_PASSWORD", "postgres") %>
  database: <%= ENV.fetch("DB_NAME", "myapp") %>
```

`bin/rails db:prepare` creates the database if it doesn't exist and runs pending migrations.

## Go

Go projects typically read `DATABASE_URL` from `.env`. Use a Makefile or shell one-liner for the bootstrap:

```yaml
hooks:
  open: "make bootstrap && goose up"
  jump: "make bootstrap"
```

```makefile
bootstrap:
	@DB_NAME=myapp_$$(echo "$$RIFT_WORKTREE" | tr '-' '_'); \
	sed "s/^DB_NAME=.*/DB_NAME=$$DB_NAME/" .env.example > .env; \
	echo "Database: $$DB_NAME"
```

If you use [`goose`](https://github.com/pressly/goose), [`golang-migrate`](https://github.com/golang-migrate/migrate), or [`atlas`](https://atlasgo.io/), point them at `DATABASE_URL` from `.env`.

## SQLite

SQLite databases are just files. Since each worktree is its own directory, `./dev.db` is already unique per worktree — no bootstrap needed for the database name.

Just copy `.env.example` to `.env`:

```yaml
hooks:
  open: "cp .env.example .env && npm run migrate"
  jump: "cp .env.example .env"
```

## Seeding

If your project has seed data, add it after migrations on `open` only — not on `jump`, since you don't want to re-seed when returning to a worktree:

```yaml
hooks:
  open: "npm run bootstrap && npm run migrate && npm run seed"
  jump: "npm run bootstrap"
```

## Cleanup

When a worktree is closed, its database lingers on the shared server. Framework tooling can handle the drop:

| Framework | Drop command |
|---|---|
| Rails | `bin/rails db:drop` |
| Django | `python manage.py flush` or drop via `dbshell` |
| Laravel | `php artisan db:wipe` |
| Prisma | `npx prisma db push --force-reset` |

```yaml
hooks:
  close: "bin/rails db:drop"
```

## Docker Compose

If your database runs in Docker Compose, each worktree already gets its own container (see [Docker Compose guide](/guides/docker-compose/#container-naming)). Use `POSTGRES_DB` (or `MYSQL_DATABASE`) so the container creates the database on first startup:

```yaml
services:
  db:
    image: postgres:16
    ports:
      - "${DB_PORT:-5432}:5432"
    environment:
      POSTGRES_DB: ${DB_NAME:-myapp}
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
```

The bootstrap script sets `DB_NAME` in `.env`, Docker Compose reads it, and Postgres creates the database automatically. No manual `CREATE DATABASE` needed.
