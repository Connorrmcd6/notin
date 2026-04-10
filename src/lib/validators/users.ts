import { z } from "zod/v4";

export const UpdateRoleSchema = z.object({
  role: z.enum(["ADMIN", "EMPLOYEE"]),
});

export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
