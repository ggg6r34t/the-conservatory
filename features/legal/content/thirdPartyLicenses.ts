import type { LegalDocumentConfig } from "@/features/legal/types";

export const thirdPartyLicensesDocument: LegalDocumentConfig = {
  title: "Third-Party Licenses",
  subtitle: "Software notices",
  description:
    "Acknowledgment of third-party open-source and commercial components used in The Conservatory.",
  prefaceLabel: "THIRD-PARTY SOFTWARE",
  prefaceTitle: "Built on open foundations",
  prefaceBody:
    "The Conservatory is a proprietary application. It includes third-party libraries and platform services governed by their own license terms.",
  sections: [
    {
      eyebrow: "FRAMEWORKS",
      title: "Core runtime",
      paragraphs: [
        "React, React Native, Expo, Expo Router, and React Navigation are used under their respective open-source licenses.",
      ],
    },
    {
      eyebrow: "UI AND DEVICE",
      title: "Interaction and media",
      paragraphs: [
        "Supporting packages may include expo-image, expo-file-system, expo-notifications, expo-secure-store, react-native-reanimated, react-native-gesture-handler, and related Expo modules listed in the project dependencies.",
      ],
    },
    {
      eyebrow: "DATA AND STATE",
      title: "Storage and validation",
      paragraphs: [
        "The app uses packages such as expo-sqlite, @react-native-async-storage/async-storage, @tanstack/react-query, Zod, and Zustand under their published licenses.",
      ],
    },
    {
      eyebrow: "CONNECTED SERVICES",
      title: "SDKs and providers",
      paragraphs: [
        "Where configured, the app integrates Supabase client libraries, RevenueCat (react-native-purchases), and PostHog (posthog-react-native) under each vendor's terms.",
      ],
    },
    {
      eyebrow: "APP OWNERSHIP",
      title: "Proprietary software",
      paragraphs: [
        "This notice does not grant rights to The Conservatory source code, branding, or product assets. It acknowledges dependencies only.",
      ],
    },
    {
      eyebrow: "FULL NOTICES",
      title: "Dependency license texts",
      paragraphs: [
        "Complete license texts for dependencies are maintained through the project's release and dependency audit process. Contact support if you require a consolidated NOTICE file for a specific release build.",
      ],
    },
  ],
};
