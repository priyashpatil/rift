---
title: "Python — Django, Flask, FastAPI"
description: "Step-by-step guide to running Python projects across multiple Rift worktrees with isolated ports and databases."
weight: 4
---

Before you begin, complete the [Getting Started](/guides/getting-started/) guide and familiarize yourself with the [bootstrap pattern](/hooks/#the-bootstrap-pattern).

---

## Step 1: Create .env.example

Commit a `.env.example` with every variable your project needs. This is the template the bootstrap script will copy and customize per worktree:

```
PORT=8000
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=myapp
DB_PORT=5432
```

Add more variables as needed. Add `.env` to `.gitignore`.

## Step 2: Create the bootstrap script

This script runs on every `rift open` and `rift jump`. It copies `.env.example` to `.env`, derives a deterministic port from the worktree name, sets a worktree-specific database name, and creates the database. See [The Bootstrap Pattern](/hooks/#the-bootstrap-pattern) for how the hash formula works.

Create `scripts/bootstrap.py`:

```python
import hashlib
import os
import re
import subprocess

worktree = os.environ["RIFT_WORKTREE"]

# Derive a deterministic base port (range 3000–9999)
digest = hashlib.sha1(worktree.encode()).hexdigest()
digits = re.sub(r"[a-f]", "", digest)[:4]
port = (int(digits) % 7000) + 3000

# Derive a worktree-specific database name
db_name = f"myapp_{worktree.replace('-', '_')}"

# Write .env from template, override PORT and DB_NAME
with open(".env.example") as f:
    env = f.read()

env = re.sub(r"^PORT=.*", f"PORT={port}", env, flags=re.MULTILINE)
env = re.sub(r"^DB_NAME=.*", f"DB_NAME={db_name}", env, flags=re.MULTILINE)

with open(".env", "w") as f:
    f.write(env)

# Create the database if it doesn't exist (PostgreSQL)
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

conn = psycopg2.connect(host="localhost", user="postgres", password="postgres", dbname="postgres")
conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
cur = conn.cursor()
cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
if not cur.fetchone():
    cur.execute(f'CREATE DATABASE "{db_name}"')
cur.close()
conn.close()

print(f"Worktree '{worktree}': port={port}, db={db_name}")
```

> **MySQL users:** Replace the `psycopg2` block with:
> ```python
> import pymysql
> conn = pymysql.connect(host="localhost", user="root")
> conn.cursor().execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
> conn.close()
> ```

Django, Flask, and FastAPI migration tools do **not** create the database automatically — the database creation in this script handles that. Install `psycopg2` (or `pymysql` for MySQL) as a dev dependency.

### Avoiding port collisions across services

Most projects run more than one service — an app server, a database, a cache. Each one binds a port, and every worktree needs its own set. Add more port variables derived from the same base so nothing collides. See [multiple ports](/hooks/#multiple-ports) for details.

Add the extra variables to `.env.example`:

```
PORT=8000
DB_PORT=5432
REDIS_PORT=6379
```

And to `scripts/bootstrap.py`, add more replacements:

```python
env = re.sub(r"^DB_PORT=.*", f"DB_PORT={port + 1}", env, flags=re.MULTILINE)
env = re.sub(r"^REDIS_PORT=.*", f"REDIS_PORT={port + 2}", env, flags=re.MULTILINE)
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

### Django

Django's `runserver` accepts a port argument. Install [`python-dotenv`](https://pypi.org/project/python-dotenv/) and add it to `manage.py` so `.env` is loaded:

```python
import dotenv
dotenv.load_dotenv()
```

Then run:

```bash
python manage.py runserver 0.0.0.0:${PORT:-8000}
```

### Flask

Flask detects `python-dotenv` and loads `.env` on startup automatically:

```bash
pip install python-dotenv
flask run --port ${PORT:-5000}
```

Or in code:

```python
import os
from flask import Flask

app = Flask(__name__)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(port=port)
```

### FastAPI

FastAPI with Uvicorn:

```bash
uvicorn main:app --port ${PORT:-8000}
```

Or in code:

```python
import os
import uvicorn
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", port=port, reload=True)
```

## Step 4: Configure your database

The bootstrap script already writes `DB_NAME` to `.env` and creates the database. Configure your framework to read it.

### Django

In `settings.py`:

```python
import os
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

### Flask / FastAPI

Configure your ORM (SQLAlchemy, etc.) to read `DB_NAME` from the environment. If using `DATABASE_URL`, have the bootstrap script set that directly instead.

## Step 5: Wire up rift.yaml

Add hooks to `rift.yaml` so the bootstrap runs automatically on worktree lifecycle events:

**Django:**

```yaml
hooks:
  open: "python scripts/bootstrap.py && pip install -r requirements.txt && python manage.py migrate"
  jump: "python scripts/bootstrap.py"
  close: "python manage.py flush --no-input"
```

**Flask (Alembic):**

```yaml
hooks:
  open: "python scripts/bootstrap.py && pip install -r requirements.txt && flask db upgrade"
  jump: "python scripts/bootstrap.py"
```

**FastAPI (Alembic):**

```yaml
hooks:
  open: "python scripts/bootstrap.py && pip install -r requirements.txt && alembic upgrade head"
  jump: "python scripts/bootstrap.py"
```

### With Docker Compose

If your services run in Docker Compose, add container lifecycle commands. See the [Docker Compose guide](/guides/docker-compose/) for full details.

```yaml
hooks:
  open: "python scripts/bootstrap.py && pip install -r requirements.txt && docker compose up -d && python manage.py migrate"
  jump: "python scripts/bootstrap.py"
  close: "docker compose down"
  purge: "docker compose down -v"
```

## Cleanup

When a worktree is closed, its database lingers on the shared server. Use the `close` hook to drop it:

| Framework | Drop command |
|---|---|
| Django | `python manage.py flush --no-input` |
| Flask / FastAPI | `alembic downgrade base` |
