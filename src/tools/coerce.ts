import { z } from "zod";

const coerceBoolean = (v: unknown): unknown => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
  }
  return v; // leave for zod to reject
};

const coerceNumber = (v: unknown): unknown => {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return v; // leave for zod to reject
};

/**
 * Accepts a boolean, or the strings "true"/"false" (case-insensitive).
 * Rejects everything else. Used because some MCP clients stringify tool
 * arguments before sending them.
 */
export function zBoolean() {
  return z.preprocess(coerceBoolean, z.boolean());
}

/** Use this when you don't need chained number constraints. */
export function zNumber() {
  return z.preprocess(coerceNumber, z.number());
}

/** Use this for pagination-style numbers: positive int, optional max. */
export function zPositiveInt(max?: number) {
  const base =
    max === undefined
      ? z.number().int().positive()
      : z.number().int().positive().max(max);
  return z.preprocess(coerceNumber, base);
}
