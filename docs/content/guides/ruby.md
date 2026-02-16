---
title: "Ruby — Rails, Sinatra"
description: "Step-by-step guide to running Ruby projects across multiple Rift worktrees with isolated ports and databases."
weight: 6
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

Add more variables as needed. Add `.env` to `.gitignore`.

## Step 2: Create the bootstrap script

This script runs on every `rift open` and `rift jump`. It copies `.env.example` to `.env`, derives a deterministic port from the worktree name, and sets a worktree-specific database name. See [The Bootstrap Pattern](/hooks/#the-bootstrap-pattern) for how the hash formula works.

Create `scripts/bootstrap.rb`:

```ruby
require "digest"

worktree = ENV.fetch("RIFT_WORKTREE")

# Derive a deterministic base port (range 3000–9999)
digest = Digest::SHA1.hexdigest(worktree).gsub(/[a-f]/, "")[0, 4]
port = (digest.to_i % 7000) + 3000

# Derive a worktree-specific database name
db_name = "myapp_#{worktree.tr('-', '_')}"

# Write .env from template, override PORT and DB_NAME
env = File.read(".env.example")
env.sub!(/^PORT=.*/, "PORT=#{port}")
env.sub!(/^DB_NAME=.*/, "DB_NAME=#{db_name}")
File.write(".env", env)

# Rails db:prepare creates the database automatically.
# No manual database creation needed.

puts "Worktree '#{worktree}': port=#{port}, db=#{db_name}"
```

> **Sinatra users** without Rails: add database creation using the `pg` gem since you won't have `db:prepare`:
> ```ruby
> require "pg"
> conn = PG.connect(host: "localhost", user: "postgres", password: "postgres", dbname: "postgres")
> unless conn.exec_params("SELECT 1 FROM pg_database WHERE datname = $1", [db_name]).any?
>   conn.exec("CREATE DATABASE \"#{db_name}\"")
> end
> conn.close
> ```

### Avoiding port collisions across services

Most projects run more than one service — an app server, a database, a cache. Each one binds a port, and every worktree needs its own set. Add more port variables derived from the same base so nothing collides. See [multiple ports](/hooks/#multiple-ports) for details.

Add the extra variables to `.env.example`:

```
PORT=3000
DB_PORT=5432
REDIS_PORT=6379
```

And to `scripts/bootstrap.rb`, add more replacements:

```ruby
env.sub!(/^DB_PORT=.*/, "DB_PORT=#{port + 1}")
env.sub!(/^REDIS_PORT=.*/, "REDIS_PORT=#{port + 2}")
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

### Rails

Add the [`dotenv-rails`](https://github.com/bkeepers/dotenv) gem to your `Gemfile` so `.env` is loaded automatically:

```ruby
gem "dotenv-rails", groups: [:development, :test]
```

```bash
bundle install
```

With `dotenv-rails`, Rails picks up `PORT` from `.env` on startup:

```bash
bin/rails server
```

Puma (the Rails default) reads `PORT` automatically via `config/puma.rb`:

```ruby
port ENV.fetch("PORT", 3000)
```

This is already the default in Rails 7+ apps.

### Sinatra

```ruby
require "sinatra"
require "dotenv/load"

set :port, ENV.fetch("PORT", "4567").to_i
```

### Rack

Any Rack-based server reads `PORT` the same way:

```ruby
require "dotenv/load"

port = ENV.fetch("PORT", "9292").to_i
Rack::Handler::Puma.run(app, Port: port)
```

## Step 4: Configure your database

The bootstrap script already writes `DB_NAME` to `.env`. Configure your framework to read it.

### Rails

In `config/database.yml`:

```yaml
development:
  adapter: postgresql
  host: <%= ENV.fetch("DB_HOST", "localhost") %>
  username: <%= ENV.fetch("DB_USER", "postgres") %>
  password: <%= ENV.fetch("DB_PASSWORD", "postgres") %>
  database: <%= ENV.fetch("DB_NAME", "myapp") %>
```

`bin/rails db:prepare` **creates the database automatically** if it doesn't exist, then runs pending migrations.

## Step 5: Wire up rift.yaml

Add hooks to `rift.yaml` so the bootstrap runs automatically on worktree lifecycle events:

**Rails:**

```yaml
hooks:
  open: "ruby scripts/bootstrap.rb && bundle install && bin/rails db:prepare"
  jump: "ruby scripts/bootstrap.rb"
  close: "bin/rails db:drop"
```

**Sinatra (with ActiveRecord):**

```yaml
hooks:
  open: "ruby scripts/bootstrap.rb && bundle install && rake db:migrate"
  jump: "ruby scripts/bootstrap.rb"
```

### With Docker Compose

If your services run in Docker Compose, add container lifecycle commands. See the [Docker Compose guide](/guides/docker-compose/) for full details.

```yaml
hooks:
  open: "ruby scripts/bootstrap.rb && bundle install && docker compose up -d && bin/rails db:prepare"
  jump: "ruby scripts/bootstrap.rb"
  close: "docker compose down"
  purge: "docker compose down -v"
```

## Cleanup

When a worktree is closed, its database lingers on the shared server. Use the `close` hook to drop it:

| Framework | Drop command |
|---|---|
| Rails | `bin/rails db:drop` |
