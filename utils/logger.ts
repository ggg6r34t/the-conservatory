export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

function write(
  level: LogLevel,
  message: string,
  payload?: Record<string, unknown>,
) {
  const entry = {
    level,
    message,
    payload,
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
