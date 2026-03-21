import type { AppErrorShape } from "@/types/api";

export function toAppError(
  error: unknown,
  fallbackMessage = "Something went wrong.",
): AppErrorShape {
  if (error instanceof Error) {
    return {
      code: "UNKNOWN",
      message: error.message || fallbackMessage,
      retryable: true,
    };
  }

  return {
    code: "UNKNOWN",
    message: fallbackMessage,
    retryable: true,
  };
}
