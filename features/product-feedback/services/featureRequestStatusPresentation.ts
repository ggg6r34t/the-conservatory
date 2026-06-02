import type { FeatureRequestStatus } from "@/features/product-feedback/constants";

type StatusPresentation = {
  label: string;
  icon: string;
  colorToken: "secondary" | "primary" | "tertiary" | "onSurfaceVariant";
  accessibilityLabel: string;
};

export const FEATURE_REQUEST_STATUS_PRESENTATION: Record<
  FeatureRequestStatus,
  StatusPresentation
> = {
  submitted: {
    label: "Submitted",
    icon: "tray-arrow-up",
    colorToken: "onSurfaceVariant",
    accessibilityLabel: "Status: submitted and awaiting review",
  },
  under_review: {
    label: "Under Review",
    icon: "magnify",
    colorToken: "secondary",
    accessibilityLabel: "Status: under review by the product team",
  },
  planned: {
    label: "Planned",
    icon: "calendar-check-outline",
    colorToken: "primary",
    accessibilityLabel: "Status: planned for a future release",
  },
  in_progress: {
    label: "In Progress",
    icon: "progress-clock",
    colorToken: "primary",
    accessibilityLabel: "Status: currently in progress",
  },
  released: {
    label: "Released",
    icon: "check-decagram",
    colorToken: "tertiary",
    accessibilityLabel: "Status: released and available",
  },
  declined: {
    label: "Declined",
    icon: "close-circle-outline",
    colorToken: "onSurfaceVariant",
    accessibilityLabel: "Status: declined with explanation",
  },
};

export function getFeatureRequestStatusPresentation(
  status: FeatureRequestStatus,
) {
  return FEATURE_REQUEST_STATUS_PRESENTATION[status];
}

export function formatFeatureRequestDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
