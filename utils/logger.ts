export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const REDACTED = "[REDACTED]";
const SENSITIVE_KEY_PATTERN =
  /(password|token|secret|authorization|cookie|session|email|phone|avatar|photo|userid|userid|user_id)/i;

function sanitizeValue(value: unknown): unknown {
  if (value == null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (SENSITIVE_KEY_PATTERN.test(key)) {
          return [key, REDACTED];
        }

        return [key, sanitizeValue(nestedValue)];
      }),
    );
  }

  if (typeof value === "string") {
    if (value.includes("@")) {
      return REDACTED;
    }

    if (value.length > 160) {
      return `${value.slice(0, 157)}...`;
    }
  }

  return value;
}

function write(
  level: LogLevel,
  message: string,
  payload?: Record<string, unknown>,
) {
  const entry = {
    level,
    message,
    payload: payload ? (sanitizeValue(payload) as Record<string, unknown>) : undefined,
    timestamp: new Date().toISOString(),
  };

  if (__DEV__) {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  debug: (message: string, payload?: Record<string, unknown>) =>
    write("DEBUG", message, payload),
  info: (message: string, payload?: Record<string, unknown>) =>
    write("INFO", message, payload),
  warn: (message: string, payload?: Record<string, unknown>) =>
    write("WARN", message, payload),
  error: (message: string, payload?: Record<string, unknown>) =>
    write("ERROR", message, payload),
};
