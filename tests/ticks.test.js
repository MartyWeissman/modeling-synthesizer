import { describe, it, expect } from "vitest";
import { formatTick, linearTicks, niceTicks, uniqueTicks } from "../src/utils/ticks.js";

describe("formatTick", () => {
  it("never truncates digits", () => {
    expect(formatTick(-1000)).toBe("-1000");
    expect(formatTick(-10000)).toBe("-10000");
    expect(formatTick(15000)).toBe("15000");
    expect(formatTick(-0.25)).toBe("-0.25");
    expect(formatTick(-10.5)).toBe("-10.5");
    expect(formatTick(0.005)).toBe("0.005");
    expect(formatTick(0.001)).toBe("0.001");
    expect(formatTick(150.5)).toBe("150.5");
  });
  it("cleans float noise", () => {
    expect(formatTick(-2.8e-17, 0.5)).toBe("0");
    expect(formatTick(0.30000000000000004)).toBe("0.3");
    expect(formatTick(0.6000000000000001, 0.2)).toBe("0.6");
  });
  it("uses the step for decimals", () => {
    expect(formatTick(1, 0.5)).toBe("1");
    expect(formatTick(1.5, 0.5)).toBe("1.5");
  });
  it("uses exponent form for huge/tiny", () => {
    expect(formatTick(1.5e6)).toBe("1.5e6");
    expect(formatTick(2e-5)).toBe("2e-5");
  });
  it("passes strings through", () => expect(formatTick("-10.0")).toBe("-10.0"));
});

describe("ticks", () => {
  it("linearTicks keeps the endpoint", () => {
    expect(linearTicks(2.4, 2.6, 0.1)).toEqual([2.4, 2.5, 2.6]);
    expect(linearTicks(0, 1, 0.2)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
  });
  it("niceTicks stay in range", () => {
    const t = niceTicks(0.24, 1.63, 5);
    expect(Math.min(...t)).toBeGreaterThanOrEqual(0.24);
    expect(Math.max(...t)).toBeLessThanOrEqual(1.63);
    expect(t.length).toBeGreaterThanOrEqual(3);
  });
  it("uniqueTicks removes duplicates", () => expect(uniqueTicks([0, 0, 1, 1.0000000000001])).toEqual([0, 1]));
});
