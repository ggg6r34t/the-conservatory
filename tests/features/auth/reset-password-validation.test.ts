import { resetPasswordSchema } from "@/features/auth/schemas/authValidation";

describe("resetPasswordSchema", () => {
  it("rejects mismatched passwords", () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: "FreshPass1",
      confirmNewPassword: "FreshPass2",
    });

    expect(result.success).toBe(false);
  });

  it("rejects weak passwords", () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: "short1",
      confirmNewPassword: "short1",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid passwords", () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: "FreshPass1",
      confirmNewPassword: "FreshPass1",
    });

    expect(result.success).toBe(true);
  });
});
