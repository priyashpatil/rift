import { chmodSync, renameSync, unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import pkg from "../../package.json";
import { clearUpdateCache } from "../update-check";

const PLATFORMS: Record<string, string> = {
  "darwin-arm64": "rift-darwin-arm64",
  "darwin-x64": "rift-darwin-x64",
  "linux-x64": "rift-linux-x64",
  "linux-arm64": "rift-linux-arm64",
};

export async function cmdUpdate(): Promise<void> {
  console.log(`Current version: ${pkg.version}`);
  console.log("Checking for updates...\n");

  // Fetch latest version from npm
  let latestVersion: string;
  try {
    const response = await fetch(
      `https://registry.npmjs.org/${pkg.name}/latest`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as { version: string };
    latestVersion = data.version;
  } catch {
    console.error(
      "Failed to check for updates. Check your internet connection.",
    );
    process.exit(1);
  }

  if (latestVersion === pkg.version) {
    console.log("Already up to date!");
    return;
  }

  console.log(`Updating ${pkg.version} → ${latestVersion}...\n`);

  // Determine platform binary name
  const key = `${process.platform}-${process.arch}`;
  const asset = PLATFORMS[key];
  if (!asset) {
    console.error(`Unsupported platform: ${key}`);
    process.exit(1);
  }

  const currentBinary = process.execPath;
  const tmpFile = join(tmpdir(), `rift-update-${Date.now()}`);
  const releaseUrl = `https://github.com/priyashpatil/rift/releases/download/v${latestVersion}/${asset}`;

  try {
    console.log("Downloading new version...");
    const response = await fetch(releaseUrl, {
      signal: AbortSignal.timeout(60000),
      redirect: "follow",
    });
    if (!response.ok) {
      throw new Error(`Download failed: HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    writeFileSync(tmpFile, buffer);
    chmodSync(tmpFile, 0o755);

    // Replace the current binary
    try {
      unlinkSync(currentBinary);
    } catch {
      // On some systems we can't unlink a running binary, rename instead
      try {
        renameSync(currentBinary, `${currentBinary}.old`);
      } catch {
        console.error("\nUpdate failed: could not replace binary.");
        console.error("Try downloading manually:");
        console.error(`  ${releaseUrl}`);
        process.exit(1);
      }
    }
    renameSync(tmpFile, currentBinary);
    chmodSync(currentBinary, 0o755);
  } catch (err) {
    try {
      unlinkSync(tmpFile);
    } catch {
      /* ignore */
    }
    console.error("\nUpdate failed:", (err as Error).message);
    console.error(`Download manually: ${releaseUrl}`);
    process.exit(1);
  }

  clearUpdateCache();
  console.log(`\nUpdated to ${latestVersion}!`);
}
