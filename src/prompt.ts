export async function promptYesNo(question: string): Promise<boolean> {
  process.stdout.write(question);
  for await (const line of console) {
    const answer = line.trim().toLowerCase();
    return answer === "y" || answer === "yes";
  }
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
