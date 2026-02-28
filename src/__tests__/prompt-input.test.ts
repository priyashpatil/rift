import { describe, expect, test, vi } from "vitest";

// We need to mock the console async iterator to test stdin-reading functions.
// Create a helper that makes console iterable with predefined input.
function mockConsoleInput(input: string | null) {
  const originalIterator = (console as any)[Symbol.asyncIterator];
  (console as any)[Symbol.asyncIterator] = function () {
    let consumed = false;
    return {
      next() {
        if (input !== null && !consumed) {
          consumed = true;
          return Promise.resolve({ value: input, done: false });
        }
        return Promise.resolve({ value: undefined, done: true });
      },
    };
  };
  return () => {
    (console as any)[Symbol.asyncIterator] = originalIterator;
  };
}

describe("prompt module input handling", () => {
  describe("promptYesNo", () => {
    test("returns true for 'y'", async () => {
      const restore = mockConsoleInput("y");
      const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      const { promptYesNo } = await import("../prompt");

      const result = await promptYesNo("Continue? ");
      expect(result).toBe(true);

      writeSpy.mockRestore();
      restore();
    });

    test("returns true for 'yes'", async () => {
      const restore = mockConsoleInput("yes");
      const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      const { promptYesNo } = await import("../prompt");

      const result = await promptYesNo("Continue? ");
      expect(result).toBe(true);

      writeSpy.mockRestore();
      restore();
    });

    test("returns false for 'n'", async () => {
      const restore = mockConsoleInput("n");
      const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      const { promptYesNo } = await import("../prompt");

      const result = await promptYesNo("Continue? ");
      expect(result).toBe(false);

      writeSpy.mockRestore();
      restore();
    });

    test("returns false for other input", async () => {
      const restore = mockConsoleInput("maybe");
      const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      const { promptYesNo } = await import("../prompt");

      const result = await promptYesNo("Continue? ");
      expect(result).toBe(false);

      writeSpy.mockRestore();
      restore();
    });
  });

  describe("promptChoice", () => {
    test("returns index for valid number", async () => {
      const restore = mockConsoleInput("2");
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      const { promptChoice } = await import("../prompt");

      const result = await promptChoice("Pick:", ["A", "B", "C"]);
      expect(result).toBe(1); // 0-indexed

      logSpy.mockRestore();
      writeSpy.mockRestore();
      restore();
    });

    test("returns null for empty input", async () => {
      const restore = mockConsoleInput("");
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      const { promptChoice } = await import("../prompt");

      const result = await promptChoice("Pick:", ["A", "B"]);
      expect(result).toBeNull();

      logSpy.mockRestore();
      writeSpy.mockRestore();
      restore();
    });

    test("returns null for invalid input", async () => {
      const restore = mockConsoleInput("abc");
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { promptChoice } = await import("../prompt");

      const result = await promptChoice("Pick:", ["A", "B"]);
      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalledWith("Invalid selection.");

      logSpy.mockRestore();
      writeSpy.mockRestore();
      errorSpy.mockRestore();
      restore();
    });

    test("returns null for out-of-range number", async () => {
      const restore = mockConsoleInput("5");
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { promptChoice } = await import("../prompt");

      const result = await promptChoice("Pick:", ["A", "B"]);
      expect(result).toBeNull();

      logSpy.mockRestore();
      writeSpy.mockRestore();
      errorSpy.mockRestore();
      restore();
    });

    test("exits on 'q'", async () => {
      const restore = mockConsoleInput("q");
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit");
      });
      const { promptChoice } = await import("../prompt");

      try {
        await promptChoice("Pick:", ["A", "B"]);
      } catch {}

      expect(exitSpy).toHaveBeenCalledWith(0);

      logSpy.mockRestore();
      writeSpy.mockRestore();
      exitSpy.mockRestore();
      restore();
    });
  });

  describe("promptString", () => {
    test("returns trimmed input", async () => {
      const restore = mockConsoleInput("  hello world  ");
      const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      const { promptString } = await import("../prompt");

      const result = await promptString("Name: ");
      expect(result).toBe("hello world");

      writeSpy.mockRestore();
      restore();
    });
  });

  describe("empty stdin (iterator exhausted)", () => {
    test("promptYesNo returns false when stdin is empty", async () => {
      const restore = mockConsoleInput(null);
      const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      const { promptYesNo } = await import("../prompt");

      const result = await promptYesNo("Continue? ");
      expect(result).toBe(false);

      writeSpy.mockRestore();
      restore();
    });

    test("promptChoice returns null when stdin is empty", async () => {
      const restore = mockConsoleInput(null);
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      const { promptChoice } = await import("../prompt");

      const result = await promptChoice("Pick:", ["A", "B"]);
      expect(result).toBeNull();

      logSpy.mockRestore();
      writeSpy.mockRestore();
      restore();
    });

    test("promptString returns empty string when stdin is empty", async () => {
      const restore = mockConsoleInput(null);
      const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      const { promptString } = await import("../prompt");

      const result = await promptString("Name: ");
      expect(result).toBe("");

      writeSpy.mockRestore();
      restore();
    });
  });
});
