let _isPremium = false;

export function setEntitlementState(isPremium: boolean): void {
  _isPremium = isPremium;
}

export function getEntitlementState(): boolean {
  return _isPremium;
}
