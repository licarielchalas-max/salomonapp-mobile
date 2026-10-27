const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// react-native-reanimated 3.x has a dead else-branch that requires
// 'react-native/Libraries/Renderer/shims/ReactNative', which was removed
// in RN 0.76+ (New Architecture). Metro resolves all requires statically,
// so we redirect it to a stub. The branch is never executed because
// isFabric() returns true on RN 0.86.
config.resolver = config.resolver ?? {};
// Dos paquetes web desde el mismo código: con EXPO_PUBLIC_APP_MODE=admin la raíz de la app es
// src/navigation/appRoot.admin.tsx; en cualquier otro caso, la app de usuarios (appRoot.ts).
const ADMIN_MODE = process.env.EXPO_PUBLIC_APP_MODE === 'admin';
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (ADMIN_MODE && /(^|\/)navigation\/appRoot$/.test(moduleName)) {
    return { filePath: path.resolve(__dirname, 'src/navigation/appRoot.admin.tsx'), type: 'sourceFile' };
  }
  if (moduleName === 'react-native/Libraries/Renderer/shims/ReactNative') {
    return {
      filePath: path.resolve(__dirname, 'stubs/ReactNativeShim.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
