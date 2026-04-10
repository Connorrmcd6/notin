import { z } from "zod/v4";

export const HolidayQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
});

export type HolidayQuery = z.infer<typeof HolidayQuerySchema>;

export const CreateHolidaySchema = z.object({
  date: z.coerce.date(),
  name: z.string().min(1).max(200),
});

export type CreateHolidayInput = z.infer<typeof CreateHolidaySchema>;

export const CalendarQuerySchema = z.object({
  year: z.coerce.number().int(),
  month: z.coerce.number().int().min(1).max(12),
});

export type CalendarQuery = z.infer<typeof CalendarQuerySchema>;
