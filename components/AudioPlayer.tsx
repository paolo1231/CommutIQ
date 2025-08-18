import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { ttsService } from '../services/ttsService';

// Platform-specific imports
let TrackPlayer: any = null;
let usePlaybackState: any = null;
let useProgress: any = null;
let State: any = null;
let Capability: any = null;
let RepeatMode: any = null;

if (Platform.OS !== 'web') {
  try {
    const trackPlayerModule = require('../utils/trackPlayerWrapper');
    TrackPlayer = trackPlayerModule.default;
    usePlaybackState = trackPlayerModule.usePlaybackState;
    useProgress = trackPlayerModule.useProgress;
    State = trackPlayerModule.State;
    Capability = trackPlayerModule.Capability;
    RepeatMode = trackPlayerModule.RepeatMode;
  } catch (error) {
    console.log('TrackPlayer not available');
  }
}

interface AudioPlayerProps {
  transcript: string;
  title?: string;
  useClientSideTTS?: boolean;
  voice?: 'sage' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  onProgressUpdate?: (progress: number, position: number) => void;
  onComplete?: () => void;
  showTranscript?: boolean;
  autoPlay?: boolean;
}

/**
 * Unified Audio Player Component
 * Handles both TTS generation and playback across all platforms
 */
export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  transcript,
  title,
  useClientSideTTS = false,
  voice = 'sage',
  onProgressUpdate,
  onComplete,
  showTranscript = true,
  autoPlay = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const playbackState = Platform.OS !== 'web' && usePlaybackState ? usePlaybackState() : null;
  const progress = Platform.OS !== 'web' && useProgress ? useProgress() : null;
  const lastProgressUpdateRef = useRef<number>(0);

  // Initialize TrackPlayer on native platforms
  useEffect(() => {
    if (Platform.OS !== 'web' && TrackPlayer && !hasInitialized) {
      const setupPlayer = async () => {
        try {
          await TrackPlayer.setupPlayer();
          await TrackPlayer.updateOptions({
            capabilities: [
              Capability.Play,
              Capability.Pause,
              Capability.SeekTo,
            ],
          });
          setHasInitialized(true);
        } catch (error) {
          console.error('Error setting up TrackPlayer:', error);
        }
      };
      setupPlayer();

      return () => {
        TrackPlayer.destroy().catch(() => {});
      };
    }
  }, [hasInitialized]);

  // Web audio event handlers
  useEffect(() => {
    if (Platform.OS === 'web' && audioRef.current) {
      const audio = audioRef.current;

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
        if (audio.duration && !isNaN(audio.duration)) {
          setDuration(audio.duration);
          
          // Throttle progress updates to once per second
          const now = Date.now();
          if (now - lastProgressUpdateRef.current >= 1000) {
            const progress = (audio.currentTime / audio.duration) * 100;
            onProgressUpdate?.(progress, audio.currentTime);
            lastProgressUpdateRef.current = now;
          }
        }
      };

      const handleEnded = () => {
        setIsPlaying(false);
        onComplete?.();
      };

      const handleCanPlay = () => {
        setIsLoading(false);
        if (autoPlay && !isPlaying) {
          audio.play().catch(() => {});
          setIsPlaying(true);
        }
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('loadstart', () => setIsLoading(true));

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('loadstart', () => {});
      };
    }
  }, [onProgressUpdate, onComplete, autoPlay, isPlaying]);

  // Native progress updates
  useEffect(() => {
    if (Platform.OS !== 'web' && progress) {
      setCurrentTime(progress.position);
      setDuration(progress.duration || 0);
      
      // Throttle progress updates to once per second
      const now = Date.now();
      if (onProgressUpdate && progress.position > 0 && now - lastProgressUpdateRef.current >= 1000) {
        const progressPercentage = progress.duration > 0 ? (progress.position / progress.duration) * 100 : 0;
        onProgressUpdate(progressPercentage, progress.position);
        lastProgressUpdateRef.current = now;
      }
    }
  }, [progress, onProgressUpdate]);

  // Don't generate audio immediately - wait for user interaction
  // This improves initial page load performance
  useEffect(() => {
    if (!useClientSideTTS && transcript && !audioUrl && !isGeneratingAudio && (autoPlay || hasUserInteracted)) {
      generateAudio();
    }
  }, [transcript, useClientSideTTS, autoPlay, hasUserInteracted]);

  const generateAudio = async () => {
    if (isGeneratingAudio || audioUrl) return;

    try {
      setIsGeneratingAudio(true);
      setError(null);

      const url = await ttsService.generateAudio(transcript, { voice });
      setAudioUrl(url);

      // Load the audio with streaming support
      if (Platform.OS === 'web' && audioRef.current) {
        audioRef.current.src = url;
        // Use preload="none" for lazy loading, "metadata" for duration info only,
        // or "auto" for immediate loading (when user has interacted)
        audioRef.current.preload = hasUserInteracted ? 'auto' : 'metadata';
        audioRef.current.load();
      } else if (Platform.OS !== 'web' && TrackPlayer && hasInitialized) {
        await TrackPlayer.reset();
        await TrackPlayer.add({
          id: 'audio-' + Date.now(),
          url: url,
          title: title || 'Audio',
          artist: 'CommutIQ',
        });
        if (RepeatMode) {
          await TrackPlayer.setRepeatMode(RepeatMode.Off);
        }
      }

      if (autoPlay) {
        await handlePlay();
      }
    } catch (err) {
      console.error('Error generating audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate audio');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handlePlay = async () => {
    try {
      // Mark that user has interacted
      setHasUserInteracted(true);
      
      if (useClientSideTTS) {
        // Use browser speech synthesis for web only
        if (Platform.OS === 'web' && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(transcript);
          utterance.rate = playbackSpeed;
          utterance.onend = () => {
            setIsPlaying(false);
            onComplete?.();
          };
          speechSynthesis.speak(utterance);
          setIsPlaying(true);
        } else {
          setError('Client-side TTS not available on this platform');
        }
      } else {
        // Generate audio if not already available
        if (!audioUrl && !isGeneratingAudio) {
          setIsLoading(true);
          await generateAudio();
          // After generation, try to play immediately
          if (Platform.OS === 'web' && audioRef.current) {
            audioRef.current.play().catch(console.error);
            setIsPlaying(true);
          }
          return;
        }

        if (Platform.OS === 'web' && audioRef.current) {
          // For web, ensure audio is ready to play
          if (audioRef.current.readyState >= 2) { // HAVE_CURRENT_DATA or better
            await audioRef.current.play();
            setIsPlaying(true);
          } else {
            // Audio not ready, set loading and wait for canplay event
            setIsLoading(true);
            audioRef.current.load();
            // The canplay event handler will auto-play
          }
        } else if (Platform.OS !== 'web' && TrackPlayer) {
          await TrackPlayer.play();
          setIsPlaying(true);
        }
      }
    } catch (err) {
      console.error('Error playing audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to play audio');
      setIsPlaying(false);
    }
  };

  const handlePause = async () => {
    try {
      if (useClientSideTTS && Platform.OS === 'web') {
        speechSynthesis.cancel();
      } else if (Platform.OS === 'web' && audioRef.current) {
        audioRef.current.pause();
      } else if (Platform.OS !== 'web' && TrackPlayer) {
        await TrackPlayer.pause();
      }
      setIsPlaying(false);
    } catch (err) {
      console.error('Error pausing audio:', err);
    }
  };

  const handleSeek = async (value: number) => {
    try {
      const seekPosition = (value / 100) * duration;
      if (Platform.OS === 'web' && audioRef.current) {
        audioRef.current.currentTime = seekPosition;
      } else if (Platform.OS !== 'web' && TrackPlayer) {
        await TrackPlayer.seekTo(seekPosition);
      }
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const handleSkipBackward = async () => {
    try {
      const newPosition = Math.max(0, currentTime - 15);
      if (Platform.OS === 'web' && audioRef.current) {
        audioRef.current.currentTime = newPosition;
      } else if (Platform.OS !== 'web' && TrackPlayer) {
        await TrackPlayer.seekTo(newPosition);
      }
    } catch (error) {
      console.error('Error skipping backward:', error);
    }
  };

  const handleSkipForward = async () => {
    try {
      const newPosition = Math.min(duration, currentTime + 15);
      if (Platform.OS === 'web' && audioRef.current) {
        audioRef.current.currentTime = newPosition;
      } else if (Platform.OS !== 'web' && TrackPlayer) {
        await TrackPlayer.seekTo(newPosition);
      }
    } catch (error) {
      console.error('Error skipping forward:', error);
    }
  };

  const handleSpeedChange = async () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];

    if (Platform.OS === 'web' && audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    } else if (Platform.OS !== 'web' && TrackPlayer) {
      await TrackPlayer.setRate(nextSpeed);
    }
    setPlaybackSpeed(nextSpeed);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress for native platforms
  const nativeIsPlaying = Platform.OS !== 'web' && playbackState && State ? playbackState.state === State.Playing : false;
  const currentProgress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isBuffering = isLoading || isGeneratingAudio;

  return (
    <View style={styles.container}>
      {/* Hidden audio element for web */}
      {Platform.OS === 'web' && !useClientSideTTS && (
        <audio
          ref={audioRef}
          style={{ display: 'none' }}
          preload={hasUserInteracted ? "auto" : "none"}
        />
      )}

      {/* Title */}
      {title && (
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>
      )}

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Slider
          style={styles.progressSlider}
          minimumValue={0}
          maximumValue={100}
          value={currentProgress}
          onSlidingComplete={handleSeek}
          minimumTrackTintColor="#4f46e5"
          maximumTrackTintColor="#e5e7eb"
          thumbStyle={styles.sliderThumb}
          trackStyle={styles.sliderTrack}
          disabled={isBuffering || !audioUrl}
        />
      </View>

      {/* Time Display */}
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        {/* Skip Backward */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleSkipBackward}
          disabled={isBuffering || !audioUrl}
        >
          <Ionicons name="play-skip-back" size={24} color={isBuffering ? "#9ca3af" : "#374151"} />
        </TouchableOpacity>

        {/* Play/Pause */}
        <TouchableOpacity
          style={[styles.playButton, isBuffering && styles.playButtonDisabled]}
          onPress={(Platform.OS !== 'web' ? nativeIsPlaying : isPlaying) ? handlePause : handlePlay}
          disabled={isBuffering && !useClientSideTTS}
        >
          {isBuffering ? (
            Platform.OS === 'web' ? (
              <Ionicons name="hourglass" size={28} color="white" />
            ) : (
              <ActivityIndicator size="small" color="white" />
            )
          ) : (
            <Ionicons
              name={(Platform.OS !== 'web' ? nativeIsPlaying : isPlaying) ? "pause" : "play"}
              size={28}
              color="white"
            />
          )}
        </TouchableOpacity>

        {/* Skip Forward */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleSkipForward}
          disabled={isBuffering || !audioUrl}
        >
          <Ionicons name="play-skip-forward" size={24} color={isBuffering ? "#9ca3af" : "#374151"} />
        </TouchableOpacity>

        {/* Speed Control */}
        <TouchableOpacity
          style={styles.speedButton}
          onPress={handleSpeedChange}
          disabled={isBuffering || useClientSideTTS}
        >
          <Text style={[styles.speedText, (isBuffering || useClientSideTTS) && styles.speedTextDisabled]}>
            {playbackSpeed}x
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Transcript */}
      {showTranscript && transcript && (
        <View style={styles.transcriptContainer}>
          <TouchableOpacity
            style={styles.transcriptHeader}
            onPress={() => {
              // You could add state to toggle transcript visibility
            }}
          >
            <Text style={styles.transcriptTitle}>Transcript</Text>
            <Ionicons name="chevron-down" size={20} color="#6b7280" />
          </TouchableOpacity>
          <ScrollView style={styles.transcriptScrollView} nestedScrollEnabled>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  titleContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressSlider: {
    height: 40,
  },
  sliderThumb: {
    width: 20,
    height: 20,
    backgroundColor: '#4f46e5',
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
  },
  timeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timeText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  speedButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  speedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  speedTextDisabled: {
    color: '#9ca3af',
  },
  errorContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
  },
  transcriptContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transcriptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  transcriptScrollView: {
    maxHeight: 200,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
  },
  transcriptText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
});
