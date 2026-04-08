const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Allow Metro to resolve modules from the workspace root
config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Replace react-native-background-timer with a JS-only mock.
// The native module crashes release APKs because it lacks proper auto-linking.
// @daily-co/react-native-daily-js requires it at the top level, so we must
// redirect it here for all builds (not just tests).
//
// Also replace @daily-co/react-native-daily-js itself with a no-op mock.
// The real SDK runs a recursive setTimeout loop at module-parse time which
// causes a "Maximum call stack size exceeded" crash on startup in release APKs.
// The VideoCallScreen try/catch handles the failure gracefully.
config.resolver.extraNodeModules = {
  'react-native-background-timer': path.resolve(projectRoot, 'mocks/react-native-background-timer.js'),
  '@daily-co/react-native-daily-js': path.resolve(projectRoot, 'mocks/react-native-daily-js.js'),
};

module.exports = config;
