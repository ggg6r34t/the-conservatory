import type { WalkthroughSlideId } from "@/features/onboarding/constants/walkthroughSlides";
import { getWalkthroughIndex, walkthroughSlides } from "@/features/onboarding/constants/walkthroughSlides";

export function resolveWalkthroughTarget(
  currentId: WalkthroughSlideId,
  action: "next" | "skip",
) {
  if (action === "skip") {
    return "/onboarding/permissions" as const;
  }

  const currentIndex = getWalkthroughIndex(currentId);
  const nextSlide = walkthroughSlides[currentIndex + 1];

  return nextSlide ? ("next-slide" as const) : ("/onboarding/permissions" as const);
}
