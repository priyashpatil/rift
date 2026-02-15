---
title: "Python Dev Servers"
description: "Configure Django, Flask, and FastAPI dev servers to use worktree-specific ports."
weight: 13
---

When multiple Rift worktrees run dev servers simultaneously, they all compete for the same default port. The fix: use the [bootstrap pattern](/hooks/#the-bootstrap-pattern) to write a deterministic `PORT` to `.env` for each worktree, then configure your framework to read it.

## Django

Django's `runserver` accepts a port argument:

```bash
python manage.py runserver 0.0.0.0:${PORT:-8000}
```

To load `.env` automatically, install [`python-dotenv`](https://pypi.org/project/python-dotenv/) and add this to `manage.py`:

```python
import dotenv
dotenv.load_dotenv()
```

## Flask

Flask detects `python-dotenv` and loads `.env` on startup with no extra code:

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

## FastAPI

FastAPI with Uvicorn reads the port from the command line:

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

## General pattern

Any Python server can read the port from `.env` with `python-dotenv`:

```bash
pip install python-dotenv
```

```python
import os
from dotenv import load_dotenv

load_dotenv()

port = int(os.environ.get("PORT", 8000))
```

## rift.yaml

`rift init` can set up the bootstrap hooks for you. If you prefer to configure them manually, here's an example using a bash script:

```yaml
hooks:
  open: "bash scripts/bootstrap.sh && pip install -r requirements.txt"
  jump: "bash scripts/bootstrap.sh"
```

The hook command can be anything — `bash scripts/bootstrap.sh`, `python scripts/setup.py`, `make bootstrap`, etc. See [Hooks](/hooks/#the-bootstrap-pattern) for details.
