export type PasswordStrengthLevel = "weak" | "medium" | "strong";

export interface PasswordRequirement {
  key: "noPersonalInfo" | "minLength" | "numberOrSymbol";
  label: string;
  met: boolean;
}

function normalizePersonalInfoInput(value: string) {
  return value.replace(/[<>]/g, "").trim().toLowerCase();
}

export function evaluateSignupPassword(params: {
  password: string;
  fullName?: string;
  email?: string;
}): {
  requirements: PasswordRequirement[];
  isValid: boolean;
  strength: PasswordStrengthLevel;
} {
  const { password, fullName = "", email = "" } = params;
  const normalizedPassword = password.toLowerCase();
  const sanitizedName = normalizePersonalInfoInput(fullName);
  const sanitizedEmail = normalizePersonalInfoInput(email);
  const emailLocal = sanitizedEmail.split("@")[0] ?? "";
  const nameTokens = sanitizedName
    .split(/[\s-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

  const hasPassword = password.length > 0;
  const containsNameToken = nameTokens.some((token) =>
    normalizedPassword.includes(token),
  );
  const containsEmail = Boolean(
    sanitizedEmail && normalizedPassword.includes(sanitizedEmail),
  );
  const containsEmailLocal = Boolean(
    emailLocal && normalizedPassword.includes(emailLocal),
  );

  const noPersonalInfo =
    hasPassword && !containsNameToken && !containsEmail && !containsEmailLocal;
  const minLength = password.length >= 8;
  const numberOrSymbol =
    /[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password);

  const requirements: PasswordRequirement[] = [
    {
      key: "noPersonalInfo",
      label: "Cannot contain your name or email address",
      met: noPersonalInfo,
    },
    {
      key: "minLength",
      label: "At least 8 characters",
      met: minLength,
    },
    {
      key: "numberOrSymbol",
      label: "Contains a number or symbol",
      met: numberOrSymbol,
    },
  ];

  const metCount = requirements.filter((requirement) => requirement.met).length;
  const strength: PasswordStrengthLevel =
    metCount >= 3 ? "strong" : metCount === 2 ? "medium" : "weak";

  return {
    requirements,
    isValid: requirements.every((requirement) => requirement.met),
    strength,
  };
}
