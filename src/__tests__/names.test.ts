import { describe, expect, test } from "bun:test";
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

  test("generates different names (randomness check)", () => {
    const names = new Set<string>();
    for (let i = 0; i < 50; i++) {
      names.add(generateName());
    }
    // With 52 adjectives * 49 nouns = 2548 combinations,
    // 50 draws should produce at least a few unique names
    expect(names.size).toBeGreaterThan(1);
  });
});
