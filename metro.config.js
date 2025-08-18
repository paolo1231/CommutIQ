const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add resolver configuration to handle web-specific imports
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // If running on web and trying to import react-native-track-player, return a mock
    if (platform === 'web' && moduleName === 'react-native-track-player') {
      return {
        filePath: path.resolve(__dirname, 'utils/trackPlayerMock.ts'),
        type: 'sourceFile',
      };
    }
    
    // If running on mobile and trying to import shaka-player, return a mock
    if (platform !== 'web' && moduleName.includes('shaka-player')) {
      return {
        type: 'empty',
      };
    }
    
    // Default resolver
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
