import { useContext } from "react";

import { AlertContext } from "@/providers/AlertProvider";

export function useAlert() {
  const context = useContext(AlertContext);

  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }

  return context;
}

/** Canonical alias for the app alert dialog API. */
export const useAppAlert = useAlert;
