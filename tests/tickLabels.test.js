import { describe, it, expect } from "vitest";
import {
  inferTickStep,
  formatTickLabels,
  yTickLabelSpace,
} from "../src/components/grid/tickLabels.js";

describe("inferTickStep", () => {
  it("uses the smallest positive gap", () => {
    expect(inferTickStep([0, 0.25, 0.5, 1])).toBe(0.25);
    expect(inferTickStep([-10, 0, 10])).toBe(10);
  });
  it("ignores duplicates, strings that are not numbers, and single ticks", () => {
    expect(inferTickStep([0, 0, 5])).toBe(5);
    expect(inferTickStep([3])).toBeUndefined();
    expect(inferTickStep([])).toBeUndefined();
  });
  it("rounds non-terminating steps to 2 significant digits", () => {
    expect(inferTickStep([0, 1 / 3, 2 / 3, 1])).toBe(0.33);
  });
});

describe("formatTickLabels", () => {
  it("formats the review's problem cases correctly (no truncation)", () => {
    expect(formatTickLabels([-1000, 0, 1000])).toEqual(["-1000", "0", "1000"]);
    expect(formatTickLabels([0, 15000, 30000])).toEqual(["0", "15000", "30000"]);
    expect(formatTickLabels([-0.25, 0, 0.25])).toEqual(["-0.25", "0", "0.25"]);
    expect(formatTickLabels([0, 0.001, 0.002])).toEqual(["0", "0.001", "0.002"]);
  });
  it("removes float noise", () => {
    expect(formatTickLabels([0, 0.1, 0.2, 0.30000000000000004])).toEqual([
      "0",
      "0.1",
      "0.2",
      "0.3",
    ]);
  });
  it("passes string ticks through (does not throw)", () => {
    expect(formatTickLabels(["-10", 0, "10"])).toEqual(["-10", "0", "10"]);
  });
  it("uses custom labels where given", () => {
    expect(formatTickLabels([1, 2, 3], ["a", undefined, "c"])).toEqual(["a", "2", "c"]);
  });
  it("keeps thirds short", () => {
    expect(formatTickLabels([0, 1 / 3, 2 / 3, 1])).toEqual(["0", "0.33", "0.67", "1"]);
  });
});

describe("yTickLabelSpace", () => {
  it("sizes padding from displayed labels, not raw float strings", () => {
    const raw = [0, 0.1, 0.2, 0.30000000000000004];
    expect(yTickLabelSpace(formatTickLabels(raw))).toBe(Math.max(25, 3 * 6 + 10));
    expect(yTickLabelSpace([])).toBe(25);
  });
});
