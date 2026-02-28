import { describe, expect, test } from "vitest";
import { generateName } from "../names";
import { ADJECTIVES, NOUNS } from "../constants";

describe("generateName", () => {
  test("returns a string in adjective-noun format", () => {
    const name = generateName();
    const parts = name.split("-");
    expect(parts).toHaveLength(2);
    expect(ADJECTIVES).toContain(parts[0]);
    expect(NOUNS).toContain(parts[1]);
  });

  test("uses adjectives and nouns from constants", () => {
    // Verify the function draws from the expected word lists
    const name = generateName();
    const [adj, noun] = name.split("-");
    expect(ADJECTIVES.indexOf(adj)).not.toBe(-1);
    expect(NOUNS.indexOf(noun)).not.toBe(-1);
  });
});
