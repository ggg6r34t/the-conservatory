import { trackEvent } from "@/services/analytics/analyticsService";
import type { Photo } from "@/types/models";

export type PlantPhotoDisplayContext = "card" | "detail";

export type PlantPhotoUriSource =
  | "thumbnail_local"
  | "local"
  | "thumbnail_remote"
  | "remote";

export type PhotoUriFields = {
  localUri?: string | null;
  remoteUrl?: string | null;
  storagePath?: string | null;
  photoRole?: Photo["photoRole"];
  isPrimary?: Photo["isPrimary"];
  updatedAt?: string | null;
  thumbnailLocalUri?: string | null;
  thumbnailRemoteUrl?: string | null;
};

function normalizeUri(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isLikelyRenderableUri(uri: string) {
  return (
    uri.startsWith("file:") ||
    uri.startsWith("content:") ||
    uri.startsWith("http://") ||
    uri.startsWith("https://")
  );
}

function resolvePhotoRole(photo: PhotoUriFields) {
  return photo.photoRole ?? (photo.isPrimary === 1 ? "primary" : "progress");
}

function trackPlantPhotoResolved(
  screen: string,
  sourceType: PlantPhotoUriSource,
  photo: PhotoUriFields,
) {
  trackEvent("plant_photo_resolved", {
    screen,
    source_type: sourceType,
    has_local_uri: Boolean(normalizeUri(photo.localUri)),
    has_remote_url: Boolean(normalizeUri(photo.remoteUrl)),
    is_primary: photo.isPrimary === 1,
    photo_role: resolvePhotoRole(photo),
  });

  trackEvent(
    sourceType === "local" || sourceType === "thumbnail_local"
      ? "plant_photo_local_displayed"
      : "plant_photo_remote_displayed",
    {
      screen,
      source_type: sourceType,
      is_primary: photo.isPrimary === 1,
      photo_role: resolvePhotoRole(photo),
    },
  );
}

function trackPlantPhotoResolutionFailed(
  screen: string,
  photo: PhotoUriFields | null | undefined,
) {
  trackEvent("plant_photo_resolution_failed", {
    screen,
    has_local_uri: Boolean(normalizeUri(photo?.localUri)),
    has_remote_url: Boolean(normalizeUri(photo?.remoteUrl)),
    is_primary: photo ? photo.isPrimary === 1 : false,
    photo_role: photo ? resolvePhotoRole(photo) : null,
  });
}

/**
 * Canonical display URI for a photo row.
 * Card/list: thumbnail → local → thumbnail remote → remote.
 * Detail/fullscreen: local → remote → thumbnails.
 */
export function resolvePhotoDisplayUri(
  photo: PhotoUriFields | null | undefined,
  options?: {
    context?: PlantPhotoDisplayContext;
    analyticsScreen?: string;
  },
): string | null {
  if (!photo) {
    if (options?.analyticsScreen) {
      trackPlantPhotoResolutionFailed(options.analyticsScreen, photo);
    }
    return null;
  }

  const context = options?.context ?? "card";
  const chain: Array<[PlantPhotoUriSource, string | null | undefined]> =
    context === "card"
      ? [
          ["thumbnail_local", photo.thumbnailLocalUri],
          ["local", photo.localUri],
          ["thumbnail_remote", photo.thumbnailRemoteUrl],
          ["remote", photo.remoteUrl],
        ]
      : [
          ["local", photo.localUri],
          ["remote", photo.remoteUrl],
          ["thumbnail_local", photo.thumbnailLocalUri],
          ["thumbnail_remote", photo.thumbnailRemoteUrl],
        ];

  for (const [sourceType, raw] of chain) {
    const uri = normalizeUri(raw);
    if (!uri || !isLikelyRenderableUri(uri)) {
      continue;
    }

    if (options?.analyticsScreen) {
      trackPlantPhotoResolved(options.analyticsScreen, sourceType, photo);
    }

    return uri;
  }

  if (options?.analyticsScreen) {
    trackPlantPhotoResolutionFailed(options.analyticsScreen, photo);
  }

  return null;
}

export function resolvePrimaryPlantPhoto<T extends PhotoUriFields & { id?: string }>(
  photos: T[],
): T | null {
  if (!photos.length) {
    return null;
  }

  const explicitPrimary =
    photos.find((photo) => photo.isPrimary === 1) ??
    photos.find((photo) => resolvePhotoRole(photo) === "primary");
  const ordered = explicitPrimary
    ? [explicitPrimary, ...photos.filter((photo) => photo !== explicitPrimary)]
    : photos;

  for (const photo of ordered) {
    if (resolvePhotoDisplayUri(photo)) {
      return photo;
    }
  }

  return (explicitPrimary ?? photos[0] ?? null) as T | null;
}

export interface PrimaryPhotoSummaryFields {
  primaryPhotoUri?: string | null;
  primaryPhotoLocalUri?: string | null;
  primaryPhotoRemoteUrl?: string | null;
  primaryPhotoStoragePath?: string | null;
  primaryPhotoRole?: "primary" | "progress" | null;
  primaryPhotoUpdatedAt?: string | null;
}

export interface PrimaryPhotoListFields {
  primaryPhotoUri: string | null;
  primaryPhotoLocalUri: string | null;
  primaryPhotoRemoteUrl: string | null;
  primaryPhotoStoragePath: string | null;
  primaryPhotoRole: "primary" | "progress" | null;
  primaryPhotoUpdatedAt: string | null;
}

export function buildPrimaryPhotoListFields(
  photo: PhotoUriFields | null | undefined,
  options?: { context?: PlantPhotoDisplayContext },
): PrimaryPhotoListFields {
  if (!photo) {
    return {
      primaryPhotoUri: null,
      primaryPhotoLocalUri: null,
      primaryPhotoRemoteUrl: null,
      primaryPhotoStoragePath: null,
      primaryPhotoRole: null,
      primaryPhotoUpdatedAt: null,
    };
  }

  return {
    primaryPhotoUri: resolvePhotoDisplayUri(photo, options),
    primaryPhotoLocalUri: normalizeUri(photo.localUri),
    primaryPhotoRemoteUrl: normalizeUri(photo.remoteUrl),
    primaryPhotoStoragePath: photo.storagePath ?? null,
    primaryPhotoRole: resolvePhotoRole(photo),
    primaryPhotoUpdatedAt: photo.updatedAt ?? null,
  };
}

/** @deprecated Use resolvePhotoDisplayUri — kept for call-site clarity in list mappers. */
export function resolveRenderablePhotoUri(photo: PhotoUriFields | undefined) {
  return resolvePhotoDisplayUri(photo, { context: "card" });
}

/** Records display telemetry for list/card surfaces using resolved DTO fields. */
export function trackResolvedPlantListPhoto(
  screen: string,
  plant: PrimaryPhotoSummaryFields,
  resolvedUri: string,
) {
  const localUri = normalizeUri(plant.primaryPhotoLocalUri);
  const remoteUrl = normalizeUri(plant.primaryPhotoRemoteUrl);
  const sourceType: PlantPhotoUriSource =
    localUri && resolvedUri === localUri
      ? "local"
      : remoteUrl && resolvedUri === remoteUrl
        ? "remote"
        : localUri
          ? "local"
          : "remote";

  trackEvent("plant_photo_resolved", {
    screen,
    source_type: sourceType,
    has_local_uri: Boolean(localUri),
    has_remote_url: Boolean(remoteUrl),
    is_primary: plant.primaryPhotoRole === "primary",
    photo_role: plant.primaryPhotoRole ?? null,
  });

  trackEvent(
    sourceType === "local"
      ? "plant_photo_local_displayed"
      : "plant_photo_remote_displayed",
    {
      screen,
      source_type: sourceType,
      is_primary: plant.primaryPhotoRole === "primary",
      photo_role: plant.primaryPhotoRole ?? null,
    },
  );
}
