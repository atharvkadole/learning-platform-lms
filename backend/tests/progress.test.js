import { describe, expect, it } from "vitest";
import { calculateModuleCompletion, statusFromCompletion } from "../src/utils/progress.js";

describe("progress utilities", () => {
  it("weights learning materials and assessment equally for the MVP", () => {
    expect(calculateModuleCompletion({ materialCount: 4, masteredCount: 2, assessmentPassed: false })).toBe(25);
    expect(calculateModuleCompletion({ materialCount: 4, masteredCount: 4, assessmentPassed: true })).toBe(100);
  });

  it("maps completion percentage to learning status", () => {
    expect(statusFromCompletion(0)).toBe("NOT_STARTED");
    expect(statusFromCompletion(45)).toBe("IN_PROGRESS");
    expect(statusFromCompletion(100)).toBe("MASTERED");
  });
});
