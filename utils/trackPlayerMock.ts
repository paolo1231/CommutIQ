// Mock implementation of react-native-track-player for web
export const Capability = {
  Play: 'play',
  Pause: 'pause',
  Stop: 'stop',
  SkipToNext: 'skipToNext',
  SkipToPrevious: 'skipToPrevious',
  SeekTo: 'seekTo',
  SetRating: 'setRating',
  JumpForward: 'jumpForward',
  JumpBackward: 'jumpBackward',
};

export const State = {
  None: 'none',
  Ready: 'ready',
  Playing: 'playing',
  Paused: 'paused',
  Stopped: 'stopped',
  Buffering: 'buffering',
  Connecting: 'connecting',
  Error: 'error',
  Ended: 'ended',
  Loading: 'loading',
};

export const RepeatMode = {
  Off: 'off',
  Track: 'track',
  Queue: 'queue',
};

export const Event = {
  PlaybackState: 'playback-state',
  PlaybackError: 'playback-error',
  PlaybackQueueEnded: 'playback-queue-ended',
  PlaybackTrackChanged: 'playback-track-changed',
  PlaybackProgressUpdated: 'playback-progress-updated',
  RemotePlay: 'remote-play',
  RemotePause: 'remote-pause',
  RemoteStop: 'remote-stop',
  RemoteSkip: 'remote-skip',
  RemoteNext: 'remote-next',
  RemotePrevious: 'remote-previous',
  RemoteJumpForward: 'remote-jump-forward',
  RemoteJumpBackward: 'remote-jump-backward',
  RemoteSeek: 'remote-seek',
  RemoteSetRating: 'remote-set-rating',
  RemoteDuck: 'remote-duck',
};

class TrackPlayerMock {
  static async setupPlayer(options?: any) {
    console.log('TrackPlayer mock: setupPlayer called', options);
    return Promise.resolve();
  }

  static async updateOptions(options: any) {
    console.log('TrackPlayer mock: updateOptions called', options);
    return Promise.resolve();
  }

  static async add(tracks: any) {
    console.log('TrackPlayer mock: add called', tracks);
    return Promise.resolve();
  }

  static async remove(tracks: any) {
    console.log('TrackPlayer mock: remove called', tracks);
    return Promise.resolve();
  }

  static async skip(trackIndex: number) {
    console.log('TrackPlayer mock: skip called', trackIndex);
    return Promise.resolve();
  }

  static async skipToNext() {
    console.log('TrackPlayer mock: skipToNext called');
    return Promise.resolve();
  }

  static async skipToPrevious() {
    console.log('TrackPlayer mock: skipToPrevious called');
    return Promise.resolve();
  }

  static async reset() {
    console.log('TrackPlayer mock: reset called');
    return Promise.resolve();
  }

  static async play() {
    console.log('TrackPlayer mock: play called');
    return Promise.resolve();
  }

  static async pause() {
    console.log('TrackPlayer mock: pause called');
    return Promise.resolve();
  }

  static async stop() {
    console.log('TrackPlayer mock: stop called');
    return Promise.resolve();
  }

  static async seekTo(position: number) {
    console.log('TrackPlayer mock: seekTo called', position);
    return Promise.resolve();
  }

  static async setRate(rate: number) {
    console.log('TrackPlayer mock: setRate called', rate);
    return Promise.resolve();
  }

  static async setRepeatMode(mode: string) {
    console.log('TrackPlayer mock: setRepeatMode called', mode);
    return Promise.resolve();
  }

  static async getQueue() {
    return Promise.resolve([]);
  }

  static async getCurrentTrack() {
    return Promise.resolve(null);
  }

  static async getTrack(trackIndex: number) {
    return Promise.resolve(null);
  }

  static async getPosition() {
    return Promise.resolve(0);
  }

  static async getDuration() {
    return Promise.resolve(0);
  }

  static async getState() {
    return Promise.resolve({ state: State.None });
  }

  static async getPlaybackState() {
    return Promise.resolve({ state: State.None });
  }

  static async destroy() {
    console.log('TrackPlayer mock: destroy called');
    return Promise.resolve();
  }
}

// Mock hooks
export const usePlaybackState = () => {
  return { state: State.None };
};

export const useProgress = () => {
  return {
    position: 0,
    duration: 0,
    buffered: 0,
  };
};

export const useTrackPlayerEvents = (events: string[], handler: (event: any) => void) => {
  // Mock implementation - do nothing
};

export default TrackPlayerMock;
