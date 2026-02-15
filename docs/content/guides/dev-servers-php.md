---
title: "Laravel & Symfony Dev Servers"
description: "Configure Laravel and Symfony dev servers to use worktree-specific ports."
weight: 11
---

When multiple Rift worktrees run dev servers simultaneously, they all compete for the same default port. The fix: use the [bootstrap pattern](/hooks/#the-bootstrap-pattern) to write a deterministic `PORT` to `.env` for each worktree, then configure your framework to read it.

## Laravel

Laravel's `artisan serve` accepts a `--port` flag. Start the dev server using the generated port:

```bash
php artisan serve --port=${PORT:-8000}
```

Wrap it in a Composer script in `composer.json`:

```json
{
  "scripts": {
    "dev": "php artisan serve --port=${PORT:-8000}"
  }
}
```

Laravel already reads `.env` files for application config, so any code using `env('PORT')` or `config()` picks up the value automatically.

## Symfony

Symfony's local server also accepts a port flag:

```bash
symfony server:start --port=${PORT:-8000}
```

Or with the built-in PHP server:

```bash
php -S localhost:${PORT:-8000} -t public/
```

Add a Composer script:

```json
{
  "scripts": {
    "dev": "symfony server:start --port=${PORT:-8000}"
  }
}
```

If you use Symfony's `DotEnv` component (included by default), your application code can read the port via `$_ENV['PORT']` or `$_SERVER['PORT']`.

## rift.yaml

`rift init` can set up the bootstrap hooks for you. If you prefer to configure them manually, here's an example using a bash script:

```yaml
hooks:
  open: "bash scripts/bootstrap.sh && composer install"
  jump: "bash scripts/bootstrap.sh"
```

The hook command can be anything — `bash scripts/bootstrap.sh`, `composer run bootstrap`, `php scripts/setup.php`, etc. See [Hooks](/hooks/#the-bootstrap-pattern) for details.
