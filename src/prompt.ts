export function readKey(): Promise<Buffer> {
  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once("data", (data: Buffer) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      resolve(data);
    });
  });
}

function isTTY(): boolean {
  return typeof process.stdin.setRawMode === "function";
}

export async function promptYesNo(question: string): Promise<boolean> {
  process.stdout.write(question);

  if (!isTTY()) {
    // Fallback for non-interactive (piped) input
    for await (const line of console) {
      const answer = line.trim().toLowerCase();
      return answer === "y" || answer === "yes";
    }
    return false;
  }

  const key = await readKey();
  const byte = key[0];
  process.stdout.write("\n");

  // Esc or 'n'/'N' → no
  if (byte === 0x1b || byte === 0x6e || byte === 0x4e) return false;
  // Enter, Space, 'y'/'Y' → yes
  if (
    byte === 0x0d ||
    byte === 0x0a ||
    byte === 0x20 ||
    byte === 0x79 ||
    byte === 0x59
  )
    return true;
  // Ctrl-C → exit
  if (byte === 0x03) process.exit(130);
  return false;
}

export async function promptChoice(
  label: string,
  items: string[],
): Promise<number | null> {
  console.log(label);
  items.forEach((item, i) => console.log(`  ${i + 1}) ${item}`));
  process.stdout.write("\nEnter number (or q to quit): ");

  for await (const line of console) {
    const input = line.trim();
    if (input === "q") process.exit(0);
    if (input === "") return null;
    const num = parseInt(input, 10);
    if (!isNaN(num) && num >= 1 && num <= items.length) return num - 1;
    console.error("Invalid selection.");
    return null;
  }
  return null;
}

export async function promptString(question: string): Promise<string> {
  process.stdout.write(question);
  for await (const line of console) {
    return line.trim();
  }
  return "";
}
