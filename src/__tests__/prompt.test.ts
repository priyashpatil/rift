import { describe, expect, test, vi } from "vitest";
import { promptYesNo, promptChoice, promptString } from "../prompt";

describe("prompt module", () => {
  test("exports promptYesNo function", () => {
    expect(typeof promptYesNo).toBe("function");
  });

  test("exports promptChoice function", () => {
    expect(typeof promptChoice).toBe("function");
  });

  test("exports promptString function", () => {
    expect(typeof promptString).toBe("function");
  });

  // These functions read from stdin via `for await (const line of console)`
  // which makes them difficult to test without piped input. We verify their
  // structure and that they write prompts to stdout.

  test("promptYesNo writes question to stdout", async () => {
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    // promptYesNo will hang waiting for input, so we race with a timeout
    await Promise.race([
      promptYesNo("Test? "),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 50)),
    ]);
    expect(writeSpy).toHaveBeenCalledWith("Test? ");
    writeSpy.mockRestore();
  });

  test("promptChoice prints label and items", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    await Promise.race([
      promptChoice("Pick one:", ["A", "B", "C"]),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 50)),
    ]);

    expect(logSpy).toHaveBeenCalledWith("Pick one:");
    expect(logSpy).toHaveBeenCalledWith("  1) A");
    expect(logSpy).toHaveBeenCalledWith("  2) B");
    expect(logSpy).toHaveBeenCalledWith("  3) C");
    expect(writeSpy).toHaveBeenCalledWith("\nEnter number (or q to quit): ");
    logSpy.mockRestore();
    writeSpy.mockRestore();
  });

  test("promptString writes question to stdout", async () => {
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    await Promise.race([
      promptString("Name: "),
      new Promise<string>((resolve) => setTimeout(() => resolve(""), 50)),
    ]);

    expect(writeSpy).toHaveBeenCalledWith("Name: ");
    writeSpy.mockRestore();
  });
});
