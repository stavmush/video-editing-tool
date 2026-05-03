import { describe, it, expect } from "vitest";

// Inline helpers from WaveformStrip.tsx to test in isolation
function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const BAR_COUNT = 160;

function makeBars(seed: number): number[] {
  let s = seed;
  return Array.from({ length: BAR_COUNT }, () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const raw = s / 0x7fffffff;
    return 0.12 + Math.pow(raw, 0.55) * 0.88;
  });
}

describe("WaveformStrip bar generation", () => {
  it("generates exactly BAR_COUNT bars", () => {
    expect(makeBars(hashStr("session-abc"))).toHaveLength(BAR_COUNT);
  });

  it("all bar heights are within [0.12, 1.0]", () => {
    const bars = makeBars(hashStr("any-session-id"));
    for (const h of bars) {
      expect(h).toBeGreaterThanOrEqual(0.12);
      expect(h).toBeLessThanOrEqual(1.0);
    }
  });

  it("is deterministic — same seed produces same bars", () => {
    const seed = hashStr("stable-id");
    expect(makeBars(seed)).toEqual(makeBars(seed));
  });

  it("different session ids produce different bar sequences", () => {
    const a = makeBars(hashStr("session-1"));
    const b = makeBars(hashStr("session-2"));
    expect(a).not.toEqual(b);
  });
});

describe("hashStr", () => {
  it("is deterministic", () => {
    expect(hashStr("hello")).toBe(hashStr("hello"));
  });

  it("returns a non-negative integer", () => {
    expect(hashStr("test")).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(hashStr("test"))).toBe(true);
  });

  it("different strings produce different hashes (no trivial collisions)", () => {
    const inputs = ["a", "b", "ab", "ba", "hello", "world"];
    const hashes = new Set(inputs.map(hashStr));
    expect(hashes.size).toBe(inputs.length);
  });
});
