import pkg from "../../package.json";

export function cmdVersion(): void {
  console.log(pkg.version);
}
