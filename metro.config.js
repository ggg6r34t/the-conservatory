const path = require("path");
const fs = require("fs");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

/** Force Metro to use CJS builds; ESM subpath imports break on React Native (Windows). */
const SENTRY_CJS_ENTRIES = {
  "@sentry/browser": "node_modules/@sentry/browser/build/npm/cjs/index.js",
  "@sentry/core": "node_modules/@sentry/core/build/cjs/index.js",
  "@sentry/react": "node_modules/@sentry/react/build/cjs/index.js",
};

config.resolver.resolverMainFields = ["react-native", "browser", "main"];
config.resolver.unstable_conditionNames = ["require", "import", "react-native"];

function resolveBabelRuntimeHelper(moduleName) {
  if (!moduleName.startsWith("@babel/runtime/")) {
    return null;
  }

  const helperPath = path.resolve(projectRoot, "node_modules", `${moduleName}.js`);
  if (fs.existsSync(helperPath)) {
    return helperPath;
  }

  return null;
}

function resolvePostHogCjs(moduleName) {
  if (moduleName === "posthog-react-native") {
    return path.resolve(projectRoot, "node_modules/posthog-react-native/dist/index.js");
  }

  if (moduleName.startsWith("posthog-react-native/")) {
    const relativePath = moduleName.replace("posthog-react-native/", "");
    const candidate = path.resolve(
      projectRoot,
      "node_modules/posthog-react-native",
      `${relativePath}.js`,
    );
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolveSentryCjs(moduleName) {
  const normalized = moduleName.replace(/\\/g, "/");

  for (const [packageName, relativeCjsPath] of Object.entries(
    SENTRY_CJS_ENTRIES,
  )) {
    if (moduleName === packageName) {
      return path.resolve(projectRoot, relativeCjsPath);
    }

    const esmSegment = `${packageName}/build/esm`;
    const npmEsmSegment = `${packageName}/build/npm/esm`;

    if (
      normalized.includes(esmSegment) ||
      normalized.includes(npmEsmSegment)
    ) {
      return path.resolve(projectRoot, relativeCjsPath);
    }
  }

  return null;
}

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const babelRuntimeHelper = resolveBabelRuntimeHelper(moduleName);
  if (babelRuntimeHelper) {
    return {
      type: "sourceFile",
      filePath: babelRuntimeHelper,
    };
  }

  const posthogCjs = resolvePostHogCjs(moduleName);
  if (posthogCjs && fs.existsSync(posthogCjs)) {
    return {
      type: "sourceFile",
      filePath: posthogCjs,
    };
  }

  const sentryCjs = resolveSentryCjs(moduleName);
  if (sentryCjs) {
    return {
      type: "sourceFile",
      filePath: sentryCjs,
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
