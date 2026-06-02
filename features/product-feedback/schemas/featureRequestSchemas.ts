import { z } from "zod";

import {
  FEATURE_REQUEST_CATEGORIES,
  FEEDBACK_SCREENSHOT_MAX,
} from "@/features/product-feedback/constants";

export const submitFeatureRequestSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(4000),
  category: z.enum(FEATURE_REQUEST_CATEGORIES),
  plantId: z.string().trim().min(1).nullable().optional(),
  contactPreference: z.enum(["in_app", "email", "none"]).default("in_app"),
  screenshotUrls: z
    .array(z.string().url())
    .max(FEEDBACK_SCREENSHOT_MAX)
    .default([]),
});

export const featureRequestSearchSchema = z.object({
  query: z.string().trim().min(2).max(80),
});
