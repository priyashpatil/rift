---
title: "Node.js Dev Servers"
description: "Configure Next.js, NestJS, Vite, and Express to use worktree-specific ports."
weight: 10
---

When multiple Rift worktrees run dev servers simultaneously, they all compete for the same default port. The fix: use the [bootstrap pattern](/hooks/#the-bootstrap-pattern) to write a deterministic `PORT` to `.env` for each worktree, then configure your framework to read it.

## Next.js

Next.js reads `PORT` from `.env` automatically. No code changes needed:

```bash
npm run dev
```

## NestJS

NestJS doesn't read `.env` for the listen port by default. Update `src/main.ts`:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

If you're using `@nestjs/config`, `process.env.PORT` is already available after `ConfigModule` loads.

## Vite

Vite doesn't read the `PORT` environment variable by default. Update `vite.config.ts`:

```typescript
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 3000,
  },
});
```

Vite reads `.env` files automatically via dotenv, but `server.port` in the config is evaluated before `.env` is loaded. Using `process.env.PORT` works when the variable is set by the bootstrap script in the shell environment, or you can use `--port`:

```json
{
  "scripts": {
    "dev": "vite --port ${PORT:-3000}"
  }
}
```

## Express / generic Node.js

Any Node.js server can read `process.env.PORT`:

```javascript
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

If your framework doesn't auto-load `.env`, add `dotenv` at the top of your entry file:

```javascript
require("dotenv").config();
```

## rift.yaml

`rift init` can set up the bootstrap hooks for you. If you prefer to configure them manually, here's an example using a bash script:

```yaml
hooks:
  open: "bash scripts/bootstrap.sh && npm install"
  jump: "bash scripts/bootstrap.sh"
```

The hook command can be anything — `bash scripts/bootstrap.sh`, `npm run bootstrap`, `node scripts/setup.js`, etc. See [Hooks](/hooks/#the-bootstrap-pattern) for details.
