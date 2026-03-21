import { useMemo } from "react";

import { toAppError } from "@/utils/errorHandler";

export function useErrorHandler() {
  return useMemo(
    () => ({
      mapError: toAppError,
    }),
    [],
  );
}
