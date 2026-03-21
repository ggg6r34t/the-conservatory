import {
  loginSchema,
  signupSchema,
} from "@/features/auth/schemas/authValidation";

describe("auth validation", () => {
  it("should reject an invalid login email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "secret123",
    });
    expect(result.success).toBe(false);
  });

  it("should accept a valid signup payload", () => {
    const result = signupSchema.safeParse({
      displayName: "Elowen Thorne",
      email: "elowen@garden.io",
      password: "secret123",
    });

    expect(result.success).toBe(true);
  });
});
