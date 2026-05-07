import {
  LegalDocumentScreen,
  type LegalSection,
} from "@/features/profile/components/LegalDocumentScreen";

const sections: LegalSection[] = [
  {
    eyebrow: "FRAMEWORK FOUNDATIONS",
    title: "Core runtime and app infrastructure",
    paragraphs: [
      "The app is built using technologies such as React, React Native, Expo, Expo Router, and React Navigation. These projects are developed and licensed by their respective maintainers.",
      "Their inclusion does not change ownership of The Conservatory itself, but their applicable third-party license terms continue to apply to those components.",
    ],
  },
  {
    eyebrow: "INTERFACE AND DEVICE FEATURES",
    title: "Libraries supporting visuals and interaction",
    paragraphs: [
      "The Conservatory also uses supporting packages for icons, motion, surfaces, images, gestures, notifications, storage, networking, and related device capabilities.",
      "Examples may include libraries such as @expo/vector-icons, expo-blur, expo-image, expo-linear-gradient, react-native-paper, react-native-reanimated, and other dependencies listed in the app build.",
    ],
  },
  {
    eyebrow: "DATA AND PLATFORM SERVICES",
    title: "Supporting libraries and connected services",
    paragraphs: [
      "Some functionality also depends on third-party tools for state management, validation, local storage, secure storage, querying, and cloud-backed infrastructure.",
      "These may include packages such as @tanstack/react-query, Zod, Zustand, AsyncStorage, Expo Secure Store, and service integrations such as Supabase where configured.",
    ],
  },
  {
    eyebrow: "OWNERSHIP CLARITY",
    title: "What this screen does and does not mean",
    paragraphs: [
      "This screen does not grant rights to the source code of The Conservatory and does not mean the app itself is open source.",
      "It only acknowledges that certain third-party components used inside the app are governed by their own separate license terms.",
    ],
  },
  {
    eyebrow: "LICENSE TEXTS",
    title: "Where the governing terms come from",
    paragraphs: [
      "Each third-party component remains subject to the license published by its original author or maintainer. Where attribution, notices, or reproduction of license text is required, those obligations should be satisfied through the project's dependency and release process.",
      "Users seeking the full legal terms for a specific dependency should refer to that dependency's original published license materials.",
    ],
  },
];

export default function LicenseScreen() {
  return (
    <LegalDocumentScreen
      title="Third-Party Licenses"
      subtitle="Software notices"
      description="Information about third-party software components used in The Conservatory and the license obligations that apply to those components."
      prefaceLabel="THIRD-PARTY SOFTWARE"
      prefaceTitle="Open-source components used in the app"
      prefaceBody="The Conservatory is a proprietary application, but it relies on third-party libraries and frameworks that are distributed under their own license terms. This screen exists to acknowledge those components and direct attention to those external license obligations where required."
      sections={sections}
      closingNote="This screen should be reviewed against the app's actual dependency list and release obligations so that required third-party notices are complete and accurate."
    />
  );
}
