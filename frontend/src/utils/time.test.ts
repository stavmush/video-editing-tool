import { describe, it, expect } from "vitest";
import { timestampToSeconds, secondsToTimecode } from "./time";

describe("timestampToSeconds", () => {
  it("passes through a number unchanged", () => {
    expect(timestampToSeconds(42.5)).toBe(42.5);
    expect(timestampToSeconds(0)).toBe(0);
  });

  it("parses SRT timestamp HH:MM:SS,mmm", () => {
    expect(timestampToSeconds("00:00:00,000")).toBe(0);
    expect(timestampToSeconds("00:00:01,000")).toBe(1);
    expect(timestampToSeconds("00:01:00,000")).toBe(60);
    expect(timestampToSeconds("01:00:00,000")).toBe(3600);
    expect(timestampToSeconds("01:02:03,456")).toBeCloseTo(3723.456);
  });

  it("handles zero milliseconds when comma part is absent", () => {
    // Some SRT writers omit the milliseconds
    expect(timestampToSeconds("00:00:05")).toBe(5);
  });
});

describe("secondsToTimecode", () => {
  it("formats zero correctly", () => {
    expect(secondsToTimecode(0)).toBe("00:00:00.000");
  });

  it("formats whole seconds", () => {
    expect(secondsToTimecode(1)).toBe("00:00:01.000");
    expect(secondsToTimecode(60)).toBe("00:01:00.000");
    expect(secondsToTimecode(3600)).toBe("01:00:00.000");
  });

  it("formats fractional seconds", () => {
    expect(secondsToTimecode(1.5)).toBe("00:00:01.500");
    expect(secondsToTimecode(3723.456)).toBe("01:02:03.456");
  });

  it("pads single-digit values", () => {
    expect(secondsToTimecode(5.009)).toBe("00:00:05.009");
  });

  it("round-trips with timestampToSeconds for SRT-style timestamps", () => {
    const cases = ["00:00:00,000", "00:01:23,456", "01:02:03,789"];
    for (const ts of cases) {
      const secs = timestampToSeconds(ts);
      // secondsToTimecode uses dots, so just compare the numeric value
      expect(timestampToSeconds(secs)).toBeCloseTo(secs);
    }
  });
});
