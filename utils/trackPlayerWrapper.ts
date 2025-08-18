import { Platform } from 'react-native';

// This wrapper handles the platform-specific imports for react-native-track-player
let trackPlayerModule: any = null;

if (Platform.OS === 'web') {
  // Use mock for web
  trackPlayerModule = require('./trackPlayerMock');
} else {
  // Try to load the actual module for mobile platforms
  try {
    trackPlayerModule = require('react-native-track-player');
  } catch (error) {
    console.warn('react-native-track-player not available, using mock');
    trackPlayerModule = require('./trackPlayerMock');
  }
}

// Export everything from the module
export default trackPlayerModule.default || trackPlayerModule;
export const {
  Capability,
  State,
  RepeatMode,
  Event,
  usePlaybackState,
  useProgress,
  useTrackPlayerEvents,
} = trackPlayerModule;
