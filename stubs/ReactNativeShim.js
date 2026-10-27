// Stub for react-native/Libraries/Renderer/shims/ReactNative
// This module was removed in RN 0.76+ (New Architecture/Fabric).
// react-native-reanimated 3.x references it in a dead else-branch that
// is never reached when isFabric() returns true, but Metro resolves all
// require() calls statically. This stub satisfies the resolver.
'use strict';

module.exports = {
  findHostInstance_DEPRECATED: undefined,
};
