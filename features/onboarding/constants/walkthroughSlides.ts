import type { DimensionValue } from "react-native";

export type WalkthroughSlideId = "gallery" | "care-rhythm" | "graveyard";

export interface WalkthroughSlide {
  id: WalkthroughSlideId;
  route: `/onboarding/${WalkthroughSlideId}`;
  eyebrow: string;
  title: string;
  body: string;
  buttonLabel: string;
  imageSource: number;
  titleAccent?: string;
  layout: "overlap" | "stacked";
  imagePosition: {
    top?: number;
    left?: DimensionValue;
    right?: DimensionValue;
  };
  imageScale?: number;
  badge?: {
    eyebrow: string;
    title: string;
    icon: string;
  };
}

export const walkthroughSlides: WalkthroughSlide[] = [
  {
    id: "gallery",
    route: "/onboarding/gallery",
    eyebrow: "YOUR GALLERY",
    title: "Every plant,\nbeautifully\ndocumented.",
    body: "Build a visual archive of your entire collection with photos, care notes, and growth records.",
    buttonLabel: "Continue",
    imageSource: require("@/assets/images/lush-monstera-deliciosa-leaves-in-morning-light.png"),
    layout: "overlap",
    imagePosition: { top: 0, left: "-18%" },
    imageScale: 1.16,
  },
  {
    id: "care-rhythm",
    route: "/onboarding/care-rhythm",
    eyebrow: "CARE RHYTHM",
    title: "Consistency is the\nbest fertilizer.",
    body: "Track watering streaks, get nudged when care is due, and earn your green thumb.",
    buttonLabel: "Continue",
    imageSource: require("@/assets/images/close-up-of-hands-misting-a-green-houseplant-with-sunbeams.png"),
    titleAccent: "best fertilizer.",
    layout: "stacked",
    imagePosition: { top: -10, left: "-8%" },
    imageScale: 1.08,
    badge: {
      eyebrow: "TODAY'S GOAL",
      title: "Mist Monstera",
      icon: "wb-sunny",
    },
  },
  {
    id: "graveyard",
    route: "/onboarding/graveyard",
    eyebrow: "THE GRAVEYARD",
    title: "Every loss is a\nlesson.",
    body: "Memorialize plants that didn't make it. Record what you'd do differently.",
    buttonLabel: "Continue",
    imageSource: require("@/assets/images/peaceful-withered-botanical-detail-in-soft-morning-light.png"),
    titleAccent: "lesson.",
    layout: "overlap",
    imagePosition: { top: -18, left: "-8%" },
    imageScale: 1.1,
  },
];

export function getWalkthroughSlide(id: WalkthroughSlideId) {
  return walkthroughSlides.find((slide) => slide.id === id);
}

export function getWalkthroughIndex(id: WalkthroughSlideId) {
  return walkthroughSlides.findIndex((slide) => slide.id === id);
}
