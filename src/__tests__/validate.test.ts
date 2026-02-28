import { describe, it, expect } from "vitest";
import { validateWorktreeName, validateBranchName } from "../validate";

describe("validateWorktreeName", () => {
  it("accepts valid names", () => {
    expect(() => validateWorktreeName("my-feature")).not.toThrow();
    expect(() => validateWorktreeName("feat/login")).not.toThrow();
    expect(() => validateWorktreeName("fix_bug.123")).not.toThrow();
    expect(() => validateWorktreeName("a")).not.toThrow();
  });

  it("rejects names starting with -", () => {
    expect(() => validateWorktreeName("--exec")).toThrow("must not start");
    expect(() => validateWorktreeName("-flag")).toThrow("must not start");
  });

  it("rejects empty names", () => {
    expect(() => validateWorktreeName("")).toThrow();
  });

  it("rejects names with shell metacharacters", () => {
    expect(() => validateWorktreeName("foo;rm -rf /")).toThrow();
    expect(() => validateWorktreeName("$(whoami)")).toThrow();
    expect(() => validateWorktreeName("foo`id`")).toThrow();
    expect(() => validateWorktreeName("a&b")).toThrow();
    expect(() => validateWorktreeName("a|b")).toThrow();
  });

  it("rejects names exceeding 200 characters", () => {
    expect(() => validateWorktreeName("a".repeat(201))).toThrow();
  });
});

describe("validateBranchName", () => {
  it("accepts valid branch names", () => {
    expect(() => validateBranchName("main")).not.toThrow();
    expect(() => validateBranchName("feature/login")).not.toThrow();
    expect(() => validateBranchName("release-1.0.0")).not.toThrow();
  });

  it("rejects branch names starting with -", () => {
    expect(() => validateBranchName("--upload-pack")).toThrow("must not start");
  });

  it("rejects branch names with shell metacharacters", () => {
    expect(() => validateBranchName("main;echo hacked")).toThrow();
    expect(() => validateBranchName("$(cmd)")).toThrow();
  });
});
