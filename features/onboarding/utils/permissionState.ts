export type PermissionState =
  | "granted"
  | "denied"
  | "undetermined"
  | "unavailable";

export function combinePermissionStates(states: PermissionState[]): PermissionState {
  if (states.includes("unavailable")) {
    return "unavailable";
  }

  if (states.every((state) => state === "granted")) {
    return "granted";
  }

  if (states.includes("denied")) {
    return "denied";
  }

  return "undetermined";
}
