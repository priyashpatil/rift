---
title: "PHP — Laravel, Symfony"
description: "Step-by-step guide to running PHP projects across multiple Rift worktrees with isolated ports and databases."
weight: 5
---

Before you begin, complete the [Getting Started](/guides/getting-started/) guide and familiarize yourself with the [bootstrap pattern](/hooks/#the-bootstrap-pattern).

---

## Step 1: Create .env.example

Commit a `.env.example` with every variable your project needs. This is the template the bootstrap script will copy and customize per worktree.

**Laravel:**

```
APP_PORT=8000
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=myapp
DB_USERNAME=root
DB_PASSWORD=
```

**Symfony:**

```
APP_PORT=8000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myapp
```

Add `.env` to `.gitignore`.

## Step 2: Create the bootstrap script

This script runs on every `rift open` and `rift jump`. It copies `.env.example` to `.env`, derives a deterministic port from the worktree name, and sets a worktree-specific database name. See [The Bootstrap Pattern](/hooks/#the-bootstrap-pattern) for how the hash formula works.

**Laravel** — create `scripts/bootstrap.php`:

```php
<?php
$worktree = getenv('RIFT_WORKTREE');

// Derive a deterministic base port (range 3000–9999)
$hash = preg_replace('/[a-f]/', '', sha1($worktree));
$digits = substr($hash, 0, 4);
$port = ((int)$digits % 7000) + 3000;

// Derive a worktree-specific database name
$dbName = 'myapp_' . str_replace('-', '_', $worktree);

// Write .env from template, override port and database
$env = file_get_contents('.env.example');
$env = preg_replace('/^APP_PORT=.*/m', "APP_PORT=$port", $env);
$env = preg_replace('/^DB_DATABASE=.*/m', "DB_DATABASE=$dbName", $env);
file_put_contents('.env', $env);

// Laravel's artisan migrate creates the database automatically (9+).
// No manual database creation needed.

echo "Worktree '$worktree': port=$port, db=$dbName\n";
```

**Symfony** — create `scripts/bootstrap.php`:

```php
<?php
$worktree = getenv('RIFT_WORKTREE');

// Derive a deterministic base port (range 3000–9999)
$hash = preg_replace('/[a-f]/', '', sha1($worktree));
$digits = substr($hash, 0, 4);
$port = ((int)$digits % 7000) + 3000;

// Derive a worktree-specific database name
$dbName = 'myapp_' . str_replace('-', '_', $worktree);

// Write .env from template, replace database name in URL and port
$env = file_get_contents('.env.example');
$env = preg_replace('#/myapp#', "/$dbName", $env);
$env = preg_replace('/^APP_PORT=.*/m', "APP_PORT=$port", $env);
file_put_contents('.env', $env);

echo "Worktree '$worktree': port=$port, db=$dbName\n";
```

> Symfony's Doctrine does **not** create the database automatically. The hooks in Step 5 call `doctrine:database:create` explicitly.

### Avoiding port collisions across services

Most projects run more than one service — an app server, a database, a cache. Each one binds a port, and every worktree needs its own set. Add more port variables derived from the same base so nothing collides. See [multiple ports](/hooks/#multiple-ports) for details.

Add the extra variables to `.env.example`:

```
APP_PORT=8000
DB_PORT=3306
REDIS_PORT=6379
```

And to `scripts/bootstrap.php`, add more replacements:

```php
$env = preg_replace('/^DB_PORT=.*/m', "DB_PORT=" . ($port + 1), $env);
$env = preg_replace('/^REDIS_PORT=.*/m', "REDIS_PORT=" . ($port + 2), $env);
```

### Bash alternative

If you prefer a shell script, create `scripts/bootstrap.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

hash=$(echo -n "$RIFT_WORKTREE" | shasum | tr -d 'a-f ' | cut -c1-4)
BASE=$(( (hash % 7000) + 3000 ))
DB_NAME="myapp_$(echo "$RIFT_WORKTREE" | tr '-' '_')"

sed -e "s/^APP_PORT=.*/APP_PORT=$BASE/" \
    -e "s/^DB_DATABASE=.*/DB_DATABASE=$DB_NAME/" \
    .env.example > .env

echo "Worktree '$RIFT_WORKTREE': port=$BASE, db=$DB_NAME"
```

## Step 3: Configure your dev server

Both Laravel and Symfony already read `.env` for application config. Just pass the port to the dev server command.

### Laravel

```bash
php artisan serve --port=${APP_PORT:-8000}
```

Add a Composer script:

```json
{
  "scripts": {
    "dev": "php artisan serve --port=${APP_PORT:-8000}"
  }
}
```

### Symfony

```bash
symfony server:start --port=${APP_PORT:-8000}
```

Or with the built-in PHP server:

```bash
php -S localhost:${APP_PORT:-8000} -t public/
```

## Step 4: Configure your database

The bootstrap script already writes the database name to `.env`. Both frameworks read it automatically.

### Laravel

Laravel reads `DB_DATABASE` from `.env` with no extra configuration. `php artisan migrate` **creates the database automatically** if it doesn't exist (Laravel 9+).

### Symfony

Symfony reads `DATABASE_URL` from `.env` via its DotEnv component. Doctrine does **not** create the database automatically — the hooks in Step 5 call `doctrine:database:create --if-not-exists` before migrations.

## Step 5: Wire up rift.yaml

Add hooks to `rift.yaml` so the bootstrap runs automatically on worktree lifecycle events:

**Laravel:**

```yaml
hooks:
  open: "php scripts/bootstrap.php && composer install && php artisan migrate --force"
  jump: "php scripts/bootstrap.php"
  close: "php artisan db:wipe --force"
```

**Symfony:**

```yaml
hooks:
  open: "php scripts/bootstrap.php && composer install && php bin/console doctrine:database:create --if-not-exists && php bin/console doctrine:migrations:migrate --no-interaction"
  jump: "php scripts/bootstrap.php"
  close: "php bin/console doctrine:database:drop --force"
```

### With Docker Compose

If your services run in Docker Compose, add container lifecycle commands. See the [Docker Compose guide](/guides/docker-compose/) for full details.

```yaml
hooks:
  open: "php scripts/bootstrap.php && composer install && docker compose up -d && php artisan migrate --force"
  jump: "php scripts/bootstrap.php"
  close: "docker compose down"
  purge: "docker compose down -v"
```

## Cleanup

When a worktree is closed, its database lingers on the shared server. Use the `close` hook to drop it:

| Framework | Drop command                                     |
| --------- | ------------------------------------------------ |
| Laravel   | `php artisan db:wipe --force`                    |
| Symfony   | `php bin/console doctrine:database:drop --force` |
