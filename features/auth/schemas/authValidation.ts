import { z } from "zod";

const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Add the name you want shown in the app.")
  .max(80, "Use 80 characters or fewer.")
  .refine((value) => !/[\r\n\t]/.test(value), {
    message: "Use plain text for your name.",
  })
  .transform((value) => value.replace(/\s+/g, " "));

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Za-z]/, "Password must include at least one letter.")
    .regex(/\d/, "Password must include at least one number."),
});

export const signupSchema = loginSchema.extend({
  displayName: displayNameSchema,
});
export const forgotPasswordSchema = loginSchema.pick({
  email: true,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
