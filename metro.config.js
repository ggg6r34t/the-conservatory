const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

const sentryBrowserCjs = path.resolve(
  projectRoot,
  "node_modules/@sentry/browser/build/npm/cjs/index.js",
);

config.resolver.resolverMainFields = ["react-native", "browser", "main"];

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const normalizedModuleName = moduleName.replace(/\\/g, "/");

  if (
    moduleName === "@sentry/browser" ||
    normalizedModuleName.includes("@sentry/browser/build/npm/esm")
  ) {
    return {
      type: "sourceFile",
      filePath: sentryBrowserCjs,
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
