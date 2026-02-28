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
  describe("promptYesNo (TTY raw key mode)", () => {
    function setupTTY(keyByte: number) {
      const setRawModeMock = vi.fn();
      const resumeMock = vi.fn();
      const pauseMock = vi.fn();
      const originalSetRawMode = (process.stdin as any).setRawMode;
      const originalResume = process.stdin.resume;
      const originalPause = process.stdin.pause;
      const originalOnce = process.stdin.once;

      (process.stdin as any).setRawMode = setRawModeMock;
      process.stdin.resume = resumeMock;
      process.stdin.pause = pauseMock;

      // When readKey calls .once("data", cb), immediately invoke cb with our buffer
      const onceMock = vi
        .spyOn(process.stdin, "once")
        .mockImplementation((_event: string, cb: any) => {
          cb(Buffer.from([keyByte]));
          return process.stdin;
        });

      const writeSpy = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true);

      return {
        setRawModeMock,
        writeSpy,
        restore() {
          (process.stdin as any).setRawMode = originalSetRawMode;
          process.stdin.resume = originalResume;
          process.stdin.pause = originalPause;
          onceMock.mockRestore();
          writeSpy.mockRestore();
        },
      };
    }

    test("Enter key returns true", async () => {
      const { setRawModeMock, restore } = setupTTY(0x0d);
      const { promptYesNo } = await import("../prompt");
      const result = await promptYesNo("Continue? ");
      expect(result).toBe(true);
      expect(setRawModeMock).toHaveBeenCalledWith(true);
      expect(setRawModeMock).toHaveBeenCalledWith(false);
      restore();
    });

    test("Space key returns true", async () => {
      const { restore } = setupTTY(0x20);
      const { promptYesNo } = await import("../prompt");
      expect(await promptYesNo("Continue? ")).toBe(true);
      restore();
    });

    test("'y' key returns true", async () => {
      const { restore } = setupTTY(0x79);
      const { promptYesNo } = await import("../prompt");
      expect(await promptYesNo("Continue? ")).toBe(true);
      restore();
    });

    test("'Y' key returns true", async () => {
      const { restore } = setupTTY(0x59);
      const { promptYesNo } = await import("../prompt");
      expect(await promptYesNo("Continue? ")).toBe(true);
      restore();
    });

    test("LF (0x0a) returns true", async () => {
      const { restore } = setupTTY(0x0a);
      const { promptYesNo } = await import("../prompt");
      expect(await promptYesNo("Continue? ")).toBe(true);
      restore();
    });

    test("Esc key returns false", async () => {
      const { restore } = setupTTY(0x1b);
      const { promptYesNo } = await import("../prompt");
      expect(await promptYesNo("Continue? ")).toBe(false);
      restore();
    });

    test("'n' key returns false", async () => {
      const { restore } = setupTTY(0x6e);
      const { promptYesNo } = await import("../prompt");
      expect(await promptYesNo("Continue? ")).toBe(false);
      restore();
    });

    test("'N' key returns false", async () => {
      const { restore } = setupTTY(0x4e);
      const { promptYesNo } = await import("../prompt");
      expect(await promptYesNo("Continue? ")).toBe(false);
      restore();
    });

    test("Ctrl-C exits with code 130", async () => {
      const { restore } = setupTTY(0x03);
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit");
      });
      const { promptYesNo } = await import("../prompt");
      try {
        await promptYesNo("Continue? ");
      } catch {}
      expect(exitSpy).toHaveBeenCalledWith(130);
      exitSpy.mockRestore();
      restore();
    });

    test("unrecognized key returns false", async () => {
      const { restore } = setupTTY(0x7a); // 'z'
      const { promptYesNo } = await import("../prompt");
      expect(await promptYesNo("Continue? ")).toBe(false);
      restore();
    });

    test("prints newline after keypress", async () => {
      const { writeSpy, restore } = setupTTY(0x79);
      const { promptYesNo } = await import("../prompt");
      await promptYesNo("Continue? ");
      expect(writeSpy).toHaveBeenCalledWith("\n");
      restore();
    });
  });

  describe("readKey", () => {
    test("reads a single keypress in raw mode", async () => {
      const setRawModeMock = vi.fn();
      const originalSetRawMode = (process.stdin as any).setRawMode;
      (process.stdin as any).setRawMode = setRawModeMock;
      const resumeMock = vi
        .spyOn(process.stdin, "resume")
        .mockImplementation(() => process.stdin);
      const pauseMock = vi
        .spyOn(process.stdin, "pause")
        .mockImplementation(() => process.stdin);
      const onceMock = vi
        .spyOn(process.stdin, "once")
        .mockImplementation((_event: string, cb: any) => {
          cb(Buffer.from([0x41])); // 'A'
          return process.stdin;
        });

      const { readKey } = await import("../prompt");
      const key = await readKey();

      expect(key).toEqual(Buffer.from([0x41]));
      expect(setRawModeMock).toHaveBeenCalledWith(true);
      expect(setRawModeMock).toHaveBeenCalledWith(false);
      expect(resumeMock).toHaveBeenCalled();
      expect(pauseMock).toHaveBeenCalled();

      (process.stdin as any).setRawMode = originalSetRawMode;
      resumeMock.mockRestore();
      pauseMock.mockRestore();
      onceMock.mockRestore();
    });
  });

  describe("promptYesNo (non-TTY fallback)", () => {
    test("returns true for 'y'", async () => {
      const restore = mockConsoleInput("y");
      const writeSpy = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true);
      const { promptYesNo } = await import("../prompt");

      const result = await promptYesNo("Continue? ");
      expect(result).toBe(true);

      writeSpy.mockRestore();
      restore();
    });

    test("returns true for 'yes'", async () => {
      const restore = mockConsoleInput("yes");
      const writeSpy = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true);
      const { promptYesNo } = await import("../prompt");

      const result = await promptYesNo("Continue? ");
      expect(result).toBe(true);

      writeSpy.mockRestore();
      restore();
    });

    test("returns false for 'n'", async () => {
      const restore = mockConsoleInput("n");
      const writeSpy = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true);
      const { promptYesNo } = await import("../prompt");

      const result = await promptYesNo("Continue? ");
      expect(result).toBe(false);

      writeSpy.mockRestore();
      restore();
    });

    test("returns false for other input", async () => {
      const restore = mockConsoleInput("maybe");
      const writeSpy = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true);
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
      const writeSpy = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true);
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
      const writeSpy = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true);
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
      const writeSpy = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true);
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
      const writeSpy = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true);
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
      const writeSpy = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true);
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
      const writeSpy = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true);
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
      const writeSpy = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true);
      const { promptYesNo } = await import("../prompt");

      const result = await promptYesNo("Continue? ");
      expect(result).toBe(false);

      writeSpy.mockRestore();
      restore();
    });

    test("promptChoice returns null when stdin is empty", async () => {
      const restore = mockConsoleInput(null);
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const writeSpy = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true);
      const { promptChoice } = await import("../prompt");

      const result = await promptChoice("Pick:", ["A", "B"]);
      expect(result).toBeNull();

      logSpy.mockRestore();
      writeSpy.mockRestore();
      restore();
    });

    test("promptString returns empty string when stdin is empty", async () => {
      const restore = mockConsoleInput(null);
      const writeSpy = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true);
      const { promptString } = await import("../prompt");

      const result = await promptString("Name: ");
      expect(result).toBe("");

      writeSpy.mockRestore();
      restore();
    });
  });
});
