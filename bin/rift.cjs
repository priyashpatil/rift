#!/usr/bin/env node

const { execFileSync } = require("child_process");
const { join } = require("path");
const { existsSync } = require("fs");

const binPath = join(__dirname, "rift");

if (!existsSync(binPath)) {
  console.error(
    "rift binary not found. Try reinstalling: npm install -g @priyashpatil/rift"
  );
  process.exit(1);
}

try {
  execFileSync(binPath, process.argv.slice(2), { stdio: "inherit" });
} catch (err) {
  process.exit(err.status ?? 1);
}
