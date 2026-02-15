const { execFileSync } = require("child_process");
const { mkdirSync } = require("fs");
const { join } = require("path");

const targets = [
  "bun-darwin-arm64",
  "bun-darwin-x64",
  "bun-linux-x64",
  "bun-linux-arm64",
];

const distDir = join(__dirname, "..", "dist");
mkdirSync(distDir, { recursive: true });

for (const target of targets) {
  const name = `rift-${target.replace("bun-", "")}`;
  const outfile = join(distDir, name);
  console.log(`Building ${name}...`);
  execFileSync(
    "bun",
    ["build", "--compile", `--target=${target}`, "src/index.ts", "--outfile", outfile],
    { stdio: "inherit", cwd: join(__dirname, "..") }
  );
}

console.log("Done. Binaries are in dist/");
