import { execFileSync } from "child_process";
import pkg from "../../package.json";
import { clearUpdateCache } from "../update-check";

export async function cmdUpdate(): Promise<void> {
  console.log(`Current version: ${pkg.version}`);
  console.log("Checking for updates...\n");

  // Fetch latest version from npm
  let latestVersion: string;
  try {
    const response = await fetch(
      `https://registry.npmjs.org/${pkg.name}/latest`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as { version: string };
    latestVersion = data.version;
  } catch {
    console.error("Failed to check for updates. Check your internet connection.");
    process.exit(1);
  }

  if (latestVersion === pkg.version) {
    console.log("Already up to date!");
    return;
  }

  console.log(`Updating ${pkg.version} → ${latestVersion}...\n`);

  try {
    execFileSync("npm", ["install", "-g", `${pkg.name}@latest`], {
      stdio: "inherit",
    });
  } catch {
    console.error("\nUpdate failed. Try running manually:");
    console.error(`  npm install -g ${pkg.name}@latest`);
    process.exit(1);
  }

  clearUpdateCache();
  console.log(`\nUpdated to ${latestVersion}!`);
}
