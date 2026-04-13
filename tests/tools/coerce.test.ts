import { describe, it, expect } from "vitest";
import { zBoolean, zNumber, zPositiveInt } from "../../src/tools/coerce.js";

describe("zBoolean", () => {
  it("passes through booleans", () => {
    expect(zBoolean().parse(true)).toBe(true);
    expect(zBoolean().parse(false)).toBe(false);
  });
  it("accepts 'true' / 'false' strings case-insensitively", () => {
    expect(zBoolean().parse("true")).toBe(true);
    expect(zBoolean().parse("FALSE")).toBe(false);
    expect(zBoolean().parse(" True ")).toBe(true);
  });
  it("rejects other strings", () => {
    expect(() => zBoolean().parse("yes")).toThrow();
    expect(() => zBoolean().parse("1")).toThrow();
    expect(() => zBoolean().parse("")).toThrow();
  });
  it("rejects non-string non-boolean", () => {
    expect(() => zBoolean().parse(1)).toThrow();
    expect(() => zBoolean().parse(null)).toThrow();
  });
});

describe("zNumber", () => {
  it("passes through numbers", () => {
    expect(zNumber().parse(42)).toBe(42);
    expect(zNumber().parse(0)).toBe(0);
    expect(zNumber().parse(-1.5)).toBe(-1.5);
  });
  it("accepts numeric strings", () => {
    expect(zNumber().parse("42")).toBe(42);
    expect(zNumber().parse("3.14")).toBe(3.14);
  });
  it("rejects non-numeric strings", () => {
    expect(() => zNumber().parse("abc")).toThrow();
    expect(() => zNumber().parse("")).toThrow();
    expect(() => zNumber().parse(" ")).toThrow();
  });
  it("rejects booleans and null", () => {
    expect(() => zNumber().parse(true)).toThrow();
    expect(() => zNumber().parse(null)).toThrow();
  });
});

describe("zPositiveInt", () => {
  it("coerces string to positive int", () => {
    expect(zPositiveInt().parse("50")).toBe(50);
    expect(zPositiveInt().parse(7)).toBe(7);
  });
  it("rejects zero and negatives", () => {
    expect(() => zPositiveInt().parse(0)).toThrow();
    expect(() => zPositiveInt().parse(-1)).toThrow();
    expect(() => zPositiveInt().parse("0")).toThrow();
  });
  it("rejects non-integers", () => {
    expect(() => zPositiveInt().parse(1.5)).toThrow();
    expect(() => zPositiveInt().parse("1.5")).toThrow();
  });
  it("respects max constraint", () => {
    expect(zPositiveInt(200).parse("50")).toBe(50);
    expect(zPositiveInt(200).parse(200)).toBe(200);
    expect(() => zPositiveInt(200).parse("300")).toThrow();
    expect(() => zPositiveInt(200).parse(201)).toThrow();
  });
});
