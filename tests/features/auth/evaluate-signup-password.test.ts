import { evaluateSignupPassword } from "@/features/auth/services/evaluateSignupPassword";

describe("evaluateSignupPassword", () => {
  it("marks a strong password when all requirements are met", () => {
    const result = evaluateSignupPassword({
      password: "GardenPass9",
      fullName: "Elowen Thorne",
      email: "curator@garden.io",
    });

    expect(result.isValid).toBe(true);
    expect(result.strength).toBe("strong");
    expect(result.requirements.every((requirement) => requirement.met)).toBe(
      true,
    );
  });

  it("rejects passwords that contain the user's name", () => {
    const result = evaluateSignupPassword({
      password: "ElowenPass9",
      fullName: "Elowen Thorne",
      email: "curator@garden.io",
    });

    expect(result.isValid).toBe(false);
    expect(
      result.requirements.find(
        (requirement) => requirement.key === "noPersonalInfo",
      )?.met,
    ).toBe(false);
  });

  it("rejects passwords without a number or symbol", () => {
    const result = evaluateSignupPassword({
      password: "GardenPass",
      fullName: "Elowen Thorne",
      email: "curator@garden.io",
    });

    expect(result.isValid).toBe(false);
    expect(
      result.requirements.find(
        (requirement) => requirement.key === "numberOrSymbol",
      )?.met,
    ).toBe(false);
  });

  it("rejects passwords shorter than eight characters", () => {
    const result = evaluateSignupPassword({
      password: "Gp9!",
      fullName: "Elowen Thorne",
      email: "curator@garden.io",
    });

    expect(result.isValid).toBe(false);
    expect(
      result.requirements.find((requirement) => requirement.key === "minLength")
        ?.met,
    ).toBe(false);
  });
});
