const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Prefer CJS package entries so @sentry/browser does not use the ESM graph that
// Metro fails to resolve on Android (./log.js from build/npm/esm/index.js).
config.resolver.resolverMainFields = ["react-native", "browser", "main"];

module.exports = config;
