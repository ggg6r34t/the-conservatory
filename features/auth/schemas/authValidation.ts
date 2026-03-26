import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Za-z]/, "Password must include at least one letter.")
  .regex(/\d/, "Password must include at least one number.");

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
  password: passwordSchema,
});

export const signupSchema = loginSchema.extend({
  displayName: displayNameSchema,
});
export const forgotPasswordSchema = loginSchema.pick({
  email: true,
});
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: "Choose a new password that differs from your current one.",
    path: ["newPassword"],
  })
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    message: "Your new passwords should match.",
    path: ["confirmNewPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
