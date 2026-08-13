const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const defaultResolveRequest = config.resolver.resolveRequest;
const expoMessageSocketShim = path.resolve(__dirname, 'src/shims/expoMessageSocket.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isExpoMessageSocket =
    moduleName === './async-require/messageSocket' &&
    context.originModulePath.includes(`${path.sep}node_modules${path.sep}expo${path.sep}src${path.sep}Expo.fx`);

  if (isExpoMessageSocket) {
    return {
      filePath: expoMessageSocketShim,
      type: 'sourceFile',
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
