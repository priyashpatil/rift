---
title: "Go — Gin, Fiber, Echo"
description: "Step-by-step guide to running Go projects across multiple Rift worktrees with isolated ports and databases."
weight: 7
---

Before you begin, complete the [Getting Started](/guides/getting-started/) guide and familiarize yourself with the [bootstrap pattern](/hooks/#the-bootstrap-pattern).

---

## Step 1: Create .env.example

Commit a `.env.example` with every variable your project needs. This is the template the bootstrap script will copy and customize per worktree:

```
PORT=8080
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=myapp
```

Add more variables as needed. Add `.env` to `.gitignore`.

## Step 2: Create the bootstrap script

This script runs on every `rift open` and `rift jump`. It copies `.env.example` to `.env`, derives a deterministic port from the worktree name, sets a worktree-specific database name, and creates the database. See [The Bootstrap Pattern](/hooks/#the-bootstrap-pattern) for how the hash formula works.

Go is compiled, so the bootstrap is best handled with a Makefile or a small Go program.

### Makefile

```makefile
.PHONY: bootstrap

bootstrap:
	@go run scripts/bootstrap.go
```

Create `scripts/bootstrap.go`:

```go
//go:build ignore

package main

import (
	"crypto/sha1"
	"fmt"
	"os"
	"database/sql"
	"regexp"

	_ "github.com/lib/pq"
	"strings"
)

func main() {
	worktree := os.Getenv("RIFT_WORKTREE")

	// Derive a deterministic base port (range 3000–9999)
	hash := fmt.Sprintf("%x", sha1.Sum([]byte(worktree)))
	digits := regexp.MustCompile(`[a-f]`).ReplaceAllString(hash, "")
	if len(digits) > 4 {
		digits = digits[:4]
	}
	var num int
	fmt.Sscanf(digits, "%d", &num)
	port := (num % 7000) + 3000

	// Derive a worktree-specific database name
	dbName := "myapp_" + strings.ReplaceAll(worktree, "-", "_")

	// Write .env from template, override PORT and DB_NAME
	env, _ := os.ReadFile(".env.example")
	content := string(env)
	content = regexp.MustCompile(`(?m)^PORT=.*`).ReplaceAllString(content, fmt.Sprintf("PORT=%d", port))
	content = regexp.MustCompile(`(?m)^DB_NAME=.*`).ReplaceAllString(content, fmt.Sprintf("DB_NAME=%s", dbName))
	os.WriteFile(".env", []byte(content), 0644)

	// Create the database if it doesn't exist (PostgreSQL)
	db, _ := sql.Open("postgres", "host=localhost user=postgres password=postgres dbname=postgres sslmode=disable")
	var exists bool
	db.QueryRow("SELECT true FROM pg_database WHERE datname = $1", dbName).Scan(&exists)
	if !exists {
		db.Exec(fmt.Sprintf(`CREATE DATABASE "%s"`, dbName))
	}
	db.Close()

	fmt.Printf("Worktree '%s': port=%d, db=%s\n", worktree, port, dbName)
}
```

Go migration tools (goose, golang-migrate, atlas) do **not** create the database automatically — the database creation in this script handles that.

> **MySQL users:** Replace the `sql.Open` block with:
> ```go
> db, _ := sql.Open("mysql", "root@tcp(localhost:3306)/")
> db.Exec(fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s`", dbName))
> db.Close()
> ```

### Avoiding port collisions across services

Most projects run more than one service — an app server, a database, a cache. Each one binds a port, and every worktree needs its own set. Add more port variables derived from the same base so nothing collides. See [multiple ports](/hooks/#multiple-ports) for details.

Add the extra variables to `.env.example`:

```
PORT=8080
DB_PORT=5432
REDIS_PORT=6379
```

And to `scripts/bootstrap.go`, add more replacements:

```go
content = regexp.MustCompile(`(?m)^DB_PORT=.*`).ReplaceAllString(content, fmt.Sprintf("DB_PORT=%d", port+1))
content = regexp.MustCompile(`(?m)^REDIS_PORT=.*`).ReplaceAllString(content, fmt.Sprintf("REDIS_PORT=%d", port+2))
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

Go projects read `PORT` from `.env` using [`godotenv`](https://github.com/joho/godotenv) or by sourcing `.env` in the shell. The bootstrap script already wrote it there.

### With godotenv

```bash
go get github.com/joho/godotenv
```

```go
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
```

The pattern is the same for Gin, Fiber, and Echo — load `.env`, read `PORT`, pass it to the listener:

**Gin:** `r.Run(":" + port)`
**Fiber:** `app.Listen(":" + port)`
**Echo:** `e.Start(":" + port)`

### Without godotenv

Source `.env` in the shell instead:

```bash
source .env && go run .
```

Or in a Makefile:

```makefile
dev:
	source .env && go run .
```

## Step 4: Configure your database

The bootstrap script already writes `DB_NAME` to `.env` and creates the database. Configure your application to read it.

Use `godotenv.Load()` to load `.env`, then read `DB_NAME` (or `DATABASE_URL`) with `os.Getenv`. Point your migration tool at the same variable.

If you use [`goose`](https://github.com/pressly/goose), [`golang-migrate`](https://github.com/golang-migrate/migrate), or [`atlas`](https://atlasgo.io/), they read `DATABASE_URL` or accept it as a flag.

## Step 5: Wire up rift.yaml

Add hooks to `rift.yaml` so the bootstrap runs automatically on worktree lifecycle events:

**With goose:**

```yaml
hooks:
  open: "make bootstrap && goose up"
  jump: "make bootstrap"
  close: "goose down-to 0"
```

**With golang-migrate:**

```yaml
hooks:
  open: "make bootstrap && migrate -database ${DATABASE_URL} -path migrations up"
  jump: "make bootstrap"
```

### With Docker Compose

If your services run in Docker Compose, add container lifecycle commands. See the [Docker Compose guide](/guides/docker-compose/) for full details.

```yaml
hooks:
  open: "make bootstrap && docker compose up -d && goose up"
  jump: "make bootstrap"
  close: "docker compose down"
  purge: "docker compose down -v"
```

## Cleanup

When a worktree is closed, its database lingers on the shared server. Use the `close` hook to drop it:

```yaml
hooks:
  close: "goose down-to 0"
```
