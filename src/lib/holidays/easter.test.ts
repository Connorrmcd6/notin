import { describe, it, expect } from "vitest";
import { getEasterDate } from "./easter";

describe("getEasterDate", () => {
  it("returns correct Easter dates for known years", () => {
    expect(getEasterDate(2024)).toEqual(
      new Date(Date.UTC(2024, 2, 31, 12, 0, 0)),
    ); // March 31
    expect(getEasterDate(2025)).toEqual(
      new Date(Date.UTC(2025, 3, 20, 12, 0, 0)),
    ); // April 20
    expect(getEasterDate(2026)).toEqual(
      new Date(Date.UTC(2026, 3, 5, 12, 0, 0)),
    ); // April 5
    expect(getEasterDate(2027)).toEqual(
      new Date(Date.UTC(2027, 2, 28, 12, 0, 0)),
    ); // March 28
  });

  it("handles edge case years", () => {
    expect(getEasterDate(2000)).toEqual(
      new Date(Date.UTC(2000, 3, 23, 12, 0, 0)),
    ); // April 23
    expect(getEasterDate(2100)).toEqual(
      new Date(Date.UTC(2100, 2, 28, 12, 0, 0)),
    ); // March 28
  });

  it("returns date at noon UTC", () => {
    const date = getEasterDate(2026);
    expect(date.getUTCHours()).toBe(12);
    expect(date.getUTCMinutes()).toBe(0);
  });
});
