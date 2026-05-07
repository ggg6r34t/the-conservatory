export function getProfileDisplayName(value: string | null | undefined) {
  return value?.trim() || "Name unavailable";
}

export function getProfileDisplayEmail(value: string | null | undefined) {
  return value?.trim() || "Email unavailable";
}

export function getProfileInitials(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) {
    return "?";
  }

  return normalized
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function getProfileVersionLabel(value: string | null | undefined) {
  return value?.trim() ? `VERSION ${value.trim()}` : "Version unavailable";
}
