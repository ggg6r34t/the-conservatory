module.exports = {
  expo: {
    name: "The Conservatory",
    slug: "the-conservatory",
    version: "1.0.0",
    owner: "northfold",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "theconservatory",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      bundleIdentifier: "com.northfold.theconservatory",
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription:
          "The Conservatory uses the camera so you can capture plant photos and scan specimen tags.",
        NSPhotoLibraryUsageDescription:
          "The Conservatory uses your photo library so you can add existing plant photos to your local archive.",
        NSPhotoLibraryAddUsageDescription:
          "The Conservatory can save exported plant archive images when you choose to share or preserve them.",
        UIBackgroundModes: ["remote-notification"],
      },
    },
    android: {
      package: "com.northfold.theconservatory",
      permissions: [
        "android.permission.CAMERA",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_EXTERNAL_STORAGE",
      ],
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "@sentry/react-native",
      "expo-router",
      [
        "expo-image-picker",
        {
          photosPermission:
            "The Conservatory uses your photo library so you can add existing plant photos to your archive.",
          cameraPermission:
            "The Conservatory uses the camera so you can capture plant photos and scan specimen tags.",
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission:
            "The Conservatory uses the camera so you can capture plant photos and scan specimen tags.",
        },
      ],
      [
        "expo-notifications",
        {
          color: "#315c45",
          defaultChannel: "care-reminders",
        },
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#fbf9f4",
          dark: {
            backgroundColor: "#fbf9f4",
          },
        },
      ],
      "expo-sqlite",
      "expo-secure-store",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    updates: {
      url: "https://u.expo.dev/4069a0f9-86de-4697-b1b0-3ad1083668e0",
      fallbackToCacheTimeout: 0,
    },
    extra: {
      router: { origin: false },
      eas: {
        projectId: "4069a0f9-86de-4697-b1b0-3ad1083668e0",
      },
    },
  },
};
