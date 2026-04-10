import { z } from "zod/v4";

export const MarkReadSchema = z
  .object({
    ids: z.array(z.uuid()).min(1).optional(),
    all: z.boolean().optional(),
  })
  .refine((data) => data.ids || data.all, {
    message: "Either 'ids' or 'all' must be provided",
  });

export type MarkReadInput = z.infer<typeof MarkReadSchema>;
