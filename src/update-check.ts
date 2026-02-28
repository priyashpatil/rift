import { join } from "path";
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from "fs";
import pkg from "../package.json";
import { RIFT_DIR } from "./constants";

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_FILE = join(RIFT_DIR, "update-check.json");
const NPM_REGISTRY_URL = `https://registry.npmjs.org/${pkg.name}/latest`;

interface CacheData {
  lastCheck: number;
  latestVersion: string;
}

function readCache(): CacheData | null {
  try {
    return JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function writeCache(data: CacheData): void {
  try {
    mkdirSync(RIFT_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch {
    // Silently ignore cache write failures
  }
}

export function compareVersions(current: string, latest: string): number {
  const a = current.split(".").map(Number);
  const b = latest.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) < (b[i] ?? 0)) return -1;
    if ((a[i] ?? 0) > (b[i] ?? 0)) return 1;
  }
  return 0;
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch(NPM_REGISTRY_URL, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { version: string };
    return data.version;
  } catch {
    return null;
  }
}

export async function checkForUpdates(): Promise<void> {
  try {
    const cache = readCache();
    const now = Date.now();

    let latestVersion: string | null = null;

    if (cache && now - cache.lastCheck < CHECK_INTERVAL_MS) {
      latestVersion = cache.latestVersion;
    } else {
      latestVersion = await fetchLatestVersion();
      if (latestVersion) {
        writeCache({ lastCheck: now, latestVersion });
      }
    }

    if (latestVersion && compareVersions(pkg.version, latestVersion) < 0) {
      console.error(
        `\n  Update available: ${pkg.version} → ${latestVersion}\n  Run \`rift update\` to update\n`,
      );
    }
  } catch {
    // Never let update checks break the CLI
  }
}

export function clearUpdateCache(): void {
  try {
    unlinkSync(CACHE_FILE);
  } catch {
    // Ignore if file doesn't exist
  }
}
