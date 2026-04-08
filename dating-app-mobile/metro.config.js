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

// Replace react-native-background-timer with a JS-only mock that captures
// the original timer references BEFORE Daily.js overrides global.setTimeout
// on Android. Without this, Daily.js creates an infinite recursive loop:
//   global.setTimeout -> BackgroundTimer.setTimeout -> global.setTimeout -> ...
// which causes "Maximum call stack size exceeded" on startup.
config.resolver.extraNodeModules = {
  'react-native-background-timer': path.resolve(projectRoot, 'mocks/react-native-background-timer.js'),
};

module.exports = config;
