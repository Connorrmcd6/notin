import { describe, it, expect } from "vitest";
import {
  HolidayQuerySchema,
  CreateHolidaySchema,
  CalendarQuerySchema,
} from "./holidays";

describe("HolidayQuerySchema", () => {
  it("coerces string to number", () => {
    const result = HolidayQuerySchema.parse({ year: "2026" });
    expect(result.year).toBe(2026);
  });

  it("rejects year below 2020", () => {
    expect(() => HolidayQuerySchema.parse({ year: "2019" })).toThrow();
  });

  it("rejects year above 2100", () => {
    expect(() => HolidayQuerySchema.parse({ year: "2101" })).toThrow();
  });

  it("accepts boundary years", () => {
    expect(HolidayQuerySchema.parse({ year: "2020" }).year).toBe(2020);
    expect(HolidayQuerySchema.parse({ year: "2100" }).year).toBe(2100);
  });
});

describe("CreateHolidaySchema", () => {
  it("accepts valid input", () => {
    const result = CreateHolidaySchema.parse({
      date: "2026-12-25",
      name: "Christmas Day",
    });
    expect(result.date).toBeInstanceOf(Date);
    expect(result.name).toBe("Christmas Day");
  });

  it("rejects empty name", () => {
    expect(() =>
      CreateHolidaySchema.parse({ date: "2026-12-25", name: "" }),
    ).toThrow();
  });

  it("rejects name over 200 characters", () => {
    expect(() =>
      CreateHolidaySchema.parse({
        date: "2026-12-25",
        name: "a".repeat(201),
      }),
    ).toThrow();
  });

  it("coerces date string to Date", () => {
    const result = CreateHolidaySchema.parse({
      date: "2026-01-01",
      name: "New Year",
    });
    expect(result.date).toBeInstanceOf(Date);
  });
});

describe("CalendarQuerySchema", () => {
  it("coerces strings to numbers", () => {
    const result = CalendarQuerySchema.parse({ year: "2026", month: "4" });
    expect(result.year).toBe(2026);
    expect(result.month).toBe(4);
  });

  it("rejects month below 1", () => {
    expect(() =>
      CalendarQuerySchema.parse({ year: "2026", month: "0" }),
    ).toThrow();
  });

  it("rejects month above 12", () => {
    expect(() =>
      CalendarQuerySchema.parse({ year: "2026", month: "13" }),
    ).toThrow();
  });

  it("accepts boundary months", () => {
    expect(
      CalendarQuerySchema.parse({ year: "2026", month: "1" }).month,
    ).toBe(1);
    expect(
      CalendarQuerySchema.parse({ year: "2026", month: "12" }).month,
    ).toBe(12);
  });
});
