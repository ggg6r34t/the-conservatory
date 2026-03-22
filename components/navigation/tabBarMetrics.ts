export const TAB_BAR_BASE_HEIGHT = 72;
export const TAB_BAR_BOTTOM_PADDING_FALLBACK = 8;
export const FAB_GAP_ABOVE_TAB_BAR = 24;

export function getFloatingActionBottomOffset(bottomInset: number) {
  return (
    TAB_BAR_BASE_HEIGHT +
    Math.max(bottomInset, TAB_BAR_BOTTOM_PADDING_FALLBACK) +
    FAB_GAP_ABOVE_TAB_BAR
  );
}
