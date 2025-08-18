import TrackPlayer, {
  Capability,
  Event,
  RepeatMode,
  State,
} from '../utils/trackPlayerWrapper';

/**
 * TrackPlayerService handles initialization and configuration of the audio player
 */
export class TrackPlayerService {
  private static instance: TrackPlayerService;
  private isInitialized = false;

  static getInstance(): TrackPlayerService {
    if (!TrackPlayerService.instance) {
      TrackPlayerService.instance = new TrackPlayerService();
    }
    return TrackPlayerService.instance;
  }

  /**
   * Initialize TrackPlayer with proper configuration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await TrackPlayer.setupPlayer({
        // Configure playback options
        minBuffer: 1024 * 1024 * 10, // 10MB minimum buffer
        maxBuffer: 1024 * 1024 * 50, // 50MB maximum buffer
        playBuffer: 1024 * 1024 * 2.5, // 2.5MB playback buffer
        backBuffer: 1024 * 1024 * 5, // 5MB back buffer
      });

      await TrackPlayer.updateOptions({
        // Media controls
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SeekTo,
          Capability.Skip,
        ],
        
        // Compact notification controls (when collapsed)
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SeekTo,
        ],

        // Notification options
        progressUpdateEventInterval: 1, // Update progress every 1 second
        
        // Android specific
        alwaysPauseOnInterruption: true,
        
        // iOS specific  
        iosCategory: 'playback',
        iosCategoryMode: 'default',
      });

      // Set default repeat mode
      await TrackPlayer.setRepeatMode(RepeatMode.Off);
      
      this.isInitialized = true;
      console.log('TrackPlayer initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize TrackPlayer:', error);
      throw error;
    }
  }

  /**
   * Load and prepare a track for playback
   */
  async loadTrack(track: {
    id: string;
    url: string;
    title: string;
    artist?: string;
    duration?: number;
  }): Promise<void> {
    try {
      await this.initialize();
      
      // Clear any existing tracks
      await TrackPlayer.reset();
      
      // Add the new track
      await TrackPlayer.add({
        id: track.id,
        url: track.url,
        title: track.title,
        artist: track.artist || 'CommutIQ',
        duration: track.duration,
        artwork: undefined, // Could add lesson/course artwork here
      });
      
      console.log('Track loaded:', track.title);
      
    } catch (error) {
      console.error('Failed to load track:', error);
      throw error;
    }
  }

  /**
   * Play the current track
   */
  async play(): Promise<void> {
    try {
      await TrackPlayer.play();
    } catch (error) {
      console.error('Failed to play:', error);
      throw error;
    }
  }

  /**
   * Pause the current track
   */
  async pause(): Promise<void> {
    try {
      await TrackPlayer.pause();
    } catch (error) {
      console.error('Failed to pause:', error);
      throw error;
    }
  }

  /**
   * Seek to a specific position (in seconds)
   */
  async seekTo(position: number): Promise<void> {
    try {
      await TrackPlayer.seekTo(position);
    } catch (error) {
      console.error('Failed to seek:', error);
      throw error;
    }
  }

  /**
   * Set playback rate/speed
   */
  async setRate(rate: number): Promise<void> {
    try {
      await TrackPlayer.setRate(rate);
    } catch (error) {
      console.error('Failed to set rate:', error);
      throw error;
    }
  }

  /**
   * Get current playback state
   */
  async getState(): Promise<State> {
    try {
      const state = await TrackPlayer.getPlaybackState();
      return state.state;
    } catch (error) {
      console.error('Failed to get state:', error);
      return State.None;
    }
  }

  /**
   * Get current playback position and duration
   */
  async getProgress(): Promise<{ position: number; duration: number }> {
    try {
      const position = await TrackPlayer.getPosition();
      const duration = await TrackPlayer.getDuration();
      return { position, duration };
    } catch (error) {
      console.error('Failed to get progress:', error);
      return { position: 0, duration: 0 };
    }
  }

  /**
   * Stop playback and clean up
   */
  async stop(): Promise<void> {
    try {
      await TrackPlayer.stop();
      await TrackPlayer.reset();
    } catch (error) {
      console.error('Failed to stop:', error);
    }
  }

  /**
   * Destroy the player instance
   */
  async destroy(): Promise<void> {
    try {
      await TrackPlayer.destroy();
      this.isInitialized = false;
    } catch (error) {
      console.error('Failed to destroy TrackPlayer:', error);
    }
  }

  /**
   * Check if player is initialized
   */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const trackPlayerService = TrackPlayerService.getInstance();
