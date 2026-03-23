import { z } from "zod";

export const careLogSchema = z.object({
  logType: z.enum([
    "water",
    "mist",
    "feed",
    "repot",
    "prune",
    "inspect",
    "pest",
    "note",
  ]),
  notes: z.string().optional(),
});

export type CareLogInput = z.infer<typeof careLogSchema>;
