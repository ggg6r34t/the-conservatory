import { z } from "zod";

export const plantSchema = z.object({
  name: z.string().min(2, "Add a plant name."),
  speciesName: z.string().min(2, "Add a species or common name."),
  nickname: z.string().optional(),
  location: z.string().optional(),
  wateringIntervalDays: z.coerce.number().int().min(1).max(60),
  notes: z.string().optional(),
  photoUri: z.string().optional(),
  photoCapturedAt: z.string().optional(),
  photoMimeType: z.string().optional(),
  photoWidth: z.number().nullable().optional(),
  photoHeight: z.number().nullable().optional(),
});

export type PlantFormInput = z.infer<typeof plantSchema>;
