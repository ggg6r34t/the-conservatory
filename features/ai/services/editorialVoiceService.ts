export function selectDeterministicVariant<T>(
  variants: readonly T[],
  seed: string,
) {
  if (variants.length === 1) {
    return variants[0];
  }

  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }

  return variants[Math.abs(hash) % variants.length];
}

export function containsPressureLanguage(value: string) {
  return /\bslipping|urgent|immediate|required|must\b/i.test(value);
}
