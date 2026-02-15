---
title: "Go Dev Servers"
description: "Configure Go HTTP servers to use worktree-specific ports."
weight: 12
---

When multiple Rift worktrees run dev servers simultaneously, they all compete for the same default port. The fix: use the [bootstrap pattern](/hooks/#the-bootstrap-pattern) to write a deterministic `PORT` to `.env` for each worktree, then configure your server to read it.

## Standard library

Load the `.env` file with [`godotenv`](https://github.com/joho/godotenv), then bind to the port:

```go
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load() // loads .env if present

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
```

Install with:

```bash
go get github.com/joho/godotenv
```

## Without godotenv

Source `.env` in the shell instead of loading it in code:

```bash
source .env && go run .
```

Or in a Makefile:

```makefile
dev:
	source .env && go run .
```

## Gin

```go
func main() {
	godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	r := gin.Default()
	r.Run(":" + port)
}
```

## Fiber

```go
func main() {
	godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	app := fiber.New()
	log.Fatal(app.Listen(":" + port))
}
```

## Echo

```go
func main() {
	godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	e := echo.New()
	e.Logger.Fatal(e.Start(":" + port))
}
```

The pattern is the same across all Go frameworks — load `.env`, read `PORT`, pass it to the listener.

## rift.yaml

`rift init` can set up the bootstrap hooks for you. If you prefer to configure them manually, here's an example using a bash script:

```yaml
hooks:
  open: "bash scripts/bootstrap.sh"
  jump: "bash scripts/bootstrap.sh"
```

The hook command can be anything — `bash scripts/bootstrap.sh`, `make bootstrap`, `go run scripts/setup.go`, etc. See [Hooks](/hooks/#the-bootstrap-pattern) for details.
