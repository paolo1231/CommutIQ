import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ttsService } from '../services/ttsService';

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
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);
  const progressUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize Audio settings
  useEffect(() => {
    const setupAudio = async () => {
      try {
        // Check if Audio is available
        if (!Audio) {
          console.error('[AudioPlayer] ❌ Audio from expo-av is not available');
          setError('Audio library not available. Please restart the app.');
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        console.log('[AudioPlayer] 🎵 Audio mode configured');
      } catch (error) {
        console.error('[AudioPlayer] ❌ Error setting up audio:', error);
        setError('Failed to initialize audio. Please restart the app.');
      }
    };

    setupAudio();

    // Cleanup on unmount
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(console.error);
      }
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current);
      }
    };
  }, []);

  // Progress tracking for Expo AV
  const startProgressTracking = () => {
    if (progressUpdateInterval.current) {
      clearInterval(progressUpdateInterval.current);
    }

    progressUpdateInterval.current = setInterval(async () => {
      if (soundRef.current) {
        try {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded) {
            const position = status.positionMillis / 1000;
            const duration = status.durationMillis ? status.durationMillis / 1000 : 0;

            setCurrentTime(position);
            setDuration(duration);

            if (duration > 0) {
              const progress = (position / duration) * 100;
              onProgressUpdate?.(progress, position);
            }

            // Load next chunk if needed (when approaching end)
            if (duration > 0) {
              await loadNextChunkIfNeeded(position, duration);
            }

            // Check if current chunk ended
            if (status.didJustFinish) {
              console.log(`[AudioPlayer] 🔄 Chunk ${currentChunkIndex + 1}/${totalChunks} finished`);

              if (currentChunkIndex + 1 < totalChunks) {
                // Transition to next chunk
                await transitionToNextChunk();
              } else {
                // All chunks completed
                console.log(`[AudioPlayer] 🏁 All chunks completed`);
                setIsPlaying(false);
                onComplete?.();
                if (progressUpdateInterval.current) {
                  clearInterval(progressUpdateInterval.current);
                }
              }
            }
          }
        } catch (error) {
          console.error('[AudioPlayer] ❌ Error tracking progress:', error);
        }
      }
    }, 1000);
  };

  const stopProgressTracking = () => {
    if (progressUpdateInterval.current) {
      clearInterval(progressUpdateInterval.current);
      progressUpdateInterval.current = null;
    }
  };

  // Load next chunk when current one is near completion
  const loadNextChunkIfNeeded = async (currentPosition: number, duration: number) => {
    const timeRemaining = duration - currentPosition;
    const nextChunkIndex = currentChunkIndex + 1;

    // Load next chunk when 5 seconds remaining or 90% complete
    if (timeRemaining <= 5 || currentPosition / duration >= 0.9) {
      if (nextChunkIndex < totalChunks && !audioChunks[nextChunkIndex] && !isLoadingNextChunk) {
        console.log(`[AudioPlayer] 🔄 Loading next chunk ${nextChunkIndex + 1}/${totalChunks}...`);
        setIsLoadingNextChunk(true);

        try {
          const nextChunkUrl = await ttsService.generateChunkByIndex(
            textChunksRef.current,
            nextChunkIndex,
            voice,
            playbackSpeed
          );

          // Add to chunks array
          setAudioChunks(prev => {
            const newChunks = [...prev];
            newChunks[nextChunkIndex] = nextChunkUrl;
            return newChunks;
          });

          console.log(`[AudioPlayer] ✅ Next chunk ${nextChunkIndex + 1}/${totalChunks} loaded and ready`);
        } catch (error) {
          console.error(`[AudioPlayer] ❌ Error loading next chunk:`, error);
        } finally {
          setIsLoadingNextChunk(false);
        }
      }
    }
  };

  // Transition to next chunk when current one ends
  const transitionToNextChunk = async () => {
    const nextChunkIndex = currentChunkIndex + 1;

    if (nextChunkIndex >= totalChunks) {
      console.log(`[AudioPlayer] 🏁 All chunks completed`);
      setIsPlaying(false);
      onComplete?.();
      return;
    }

    if (!audioChunks[nextChunkIndex]) {
      console.log(`[AudioPlayer] ⏳ Next chunk not ready, loading...`);
      setIsLoadingNextChunk(true);

      try {
        const nextChunkUrl = await ttsService.generateChunkByIndex(
          textChunksRef.current,
          nextChunkIndex,
          voice,
          playbackSpeed
        );

        setAudioChunks(prev => {
          const newChunks = [...prev];
          newChunks[nextChunkIndex] = nextChunkUrl;
          return newChunks;
        });

        await loadAndPlayChunk(nextChunkUrl, nextChunkIndex);
      } catch (error) {
        console.error(`[AudioPlayer] ❌ Error loading next chunk:`, error);
        setError('Failed to load next audio chunk');
      } finally {
        setIsLoadingNextChunk(false);
      }
    } else {
      await loadAndPlayChunk(audioChunks[nextChunkIndex], nextChunkIndex);
    }
  };

  // Load and play a specific chunk
  const loadAndPlayChunk = async (chunkUrl: string, chunkIndex: number) => {
    try {
      console.log(`[AudioPlayer] 🔄 Loading chunk ${chunkIndex + 1}/${totalChunks}...`);

      // Unload current sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      // Load new chunk
      await loadAudio(chunkUrl);
      setCurrentChunkIndex(chunkIndex);
      setAudioUrl(chunkUrl);

      // Start playing immediately
      if (soundRef.current) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        startProgressTracking();
        console.log(`[AudioPlayer] ▶️ Playing chunk ${chunkIndex + 1}/${totalChunks}`);
      }
    } catch (error) {
      console.error(`[AudioPlayer] ❌ Error loading chunk ${chunkIndex + 1}:`, error);
      setError(`Failed to play chunk ${chunkIndex + 1}`);
    }
  };

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
      console.log('[AudioPlayer] 🎵 Starting audio generation...');

      // Use streaming audio generation (single continuous stream)
      const url = await ttsService.generateStreamingAudio(transcript, {
        voice,
        speed: playbackSpeed,
        onLoadStart: () => {
          console.log(`[AudioPlayer] 🔄 TTS generation started`);
        },
        onProgress: (loaded, total) => {
          const percentage = total > 0 ? ((loaded / total) * 100).toFixed(1) : '0';
          console.log(`[AudioPlayer] 📊 TTS progress: ${percentage}%`);
        },
        onCanPlay: () => {
          console.log(`[AudioPlayer] ✅ Audio ready for playback`);
          setIsLoading(false);
        },
        onError: (err) => {
          console.error(`[AudioPlayer] ❌ TTS error:`, err);
          throw err;
        },
      });

      console.log('[AudioPlayer] 🎵 First chunk ready:', streamingResult.firstChunkUrl.substring(0, 50) + '...');
      console.log('[AudioPlayer] 📝 Total chunks:', streamingResult.totalChunks);

      // Set up streaming state
      textChunksRef.current = streamingResult.textChunks;
      setTotalChunks(streamingResult.totalChunks);
      setCurrentChunkIndex(0);

      // Initialize chunks array with first chunk
      const initialChunks = new Array(streamingResult.totalChunks).fill(null);
      initialChunks[0] = streamingResult.firstChunkUrl;
      setAudioChunks(initialChunks);
      setAudioUrl(streamingResult.firstChunkUrl);

      // Load first chunk with Expo AV
      await loadAudio(streamingResult.firstChunkUrl);

      if (autoPlay) {
        console.log('[AudioPlayer] 🚀 Auto-playing...');
        await handlePlay();
      }
    } catch (err) {
      console.error('[AudioPlayer] ❌ Error generating audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate audio');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const loadAudio = async (uri: string) => {
    try {
      console.log('[AudioPlayer] 🔄 Loading audio with Expo AV (streaming mode)...');

      // Check if Audio is available
      if (!Audio || !Audio.Sound) {
        throw new Error('Audio.Sound from expo-av is not available');
      }

      // Unload previous sound if exists
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      // Create new sound with streaming-optimized settings
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: false,
          isLooping: false,
          rate: playbackSpeed,
          // Optimize for streaming
          progressUpdateIntervalMillis: 500, // More frequent updates
          positionMillis: 0,
        },
        // Status update callback for real-time feedback
        (status) => {
          if (status.isLoaded) {
            // Update duration as soon as it's available
            if (status.durationMillis && status.durationMillis !== duration * 1000) {
              setDuration(status.durationMillis / 1000);
              console.log('[AudioPlayer] 📏 Duration updated:', status.durationMillis / 1000, 'seconds');
            }

            // Update position
            if (status.positionMillis !== undefined) {
              setCurrentTime(status.positionMillis / 1000);
            }

            // Check if we can start playing (even with partial data)
            if (status.isBuffering === false && !isPlaying && autoPlay) {
              console.log('[AudioPlayer] 🚀 Auto-starting playback (streaming ready)');
              sound.playAsync().catch(console.error);
              setIsPlaying(true);
              startProgressTracking();
            }
          }
        }
      );

      soundRef.current = sound;
      console.log('[AudioPlayer] ✅ Audio loaded with streaming optimization');

      // Start loading immediately but don't wait for full download
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.durationMillis) {
          setDuration(status.durationMillis / 1000);
        }
        console.log('[AudioPlayer] 🎵 Audio ready for streaming playback');
      }

    } catch (error) {
      console.error('[AudioPlayer] ❌ Error loading audio:', error);
      setError('Failed to load audio. Please try again.');
    }
  };

  const handlePlay = async () => {
    try {
      console.log('[AudioPlayer] ▶️ handlePlay called');
      // Mark that user has interacted
      setHasUserInteracted(true);

      // Generate audio if not already available
      if (!audioUrl && !isGeneratingAudio) {
        console.log('[AudioPlayer] 🔄 No audio URL, generating...');
        setIsLoading(true);
        await generateAudio();
        return; // generateAudio will call handlePlay again if autoPlay is true
      }

      if (!soundRef.current) {
        console.log('[AudioPlayer] ❌ No sound loaded');
        setError('Audio not loaded. Please try again.');
        return;
      }

      // Check if sound is ready to play
      const status = await soundRef.current.getStatusAsync();
      if (!status.isLoaded) {
        console.log('[AudioPlayer] ⏳ Sound not loaded yet, waiting...');
        setIsLoading(true);

        // Wait a bit and try again
        setTimeout(async () => {
          try {
            const newStatus = await soundRef.current!.getStatusAsync();
            if (newStatus.isLoaded) {
              console.log('[AudioPlayer] ✅ Sound now loaded, starting playback');
              await soundRef.current!.playAsync();
              setIsPlaying(true);
              setIsLoading(false);
              startProgressTracking();
            }
          } catch (error) {
            console.error('[AudioPlayer] ❌ Error in delayed play:', error);
            setIsLoading(false);
          }
        }, 1000);
        return;
      }

      console.log('[AudioPlayer] ▶️ Starting streaming playback...');
      await soundRef.current.playAsync();
      setIsPlaying(true);
      setIsLoading(false);
      startProgressTracking();
      console.log('[AudioPlayer] ✅ Streaming playback started');

    } catch (err) {
      console.error('[AudioPlayer] ❌ Error playing audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to play audio');
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      console.log('[AudioPlayer] ⏸️ Pausing playback...');
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
      }
      setIsPlaying(false);
      stopProgressTracking();
      console.log('[AudioPlayer] ✅ Playback paused');
    } catch (err) {
      console.error('[AudioPlayer] ❌ Error pausing audio:', err);
    }
  };

  const handleSeek = async (value: number) => {
    try {
      const seekPosition = (value / 100) * duration * 1000; // Convert to milliseconds
      console.log('[AudioPlayer] ⏭️ Seeking to:', seekPosition / 1000, 'seconds');

      if (soundRef.current) {
        await soundRef.current.setPositionAsync(seekPosition);
      }
    } catch (error) {
      console.error('[AudioPlayer] ❌ Error seeking:', error);
    }
  };

  const handleSkipBackward = async () => {
    try {
      const newPosition = Math.max(0, (currentTime - 15) * 1000); // Convert to milliseconds
      console.log('[AudioPlayer] ⏪ Skipping backward to:', newPosition / 1000, 'seconds');

      if (soundRef.current) {
        await soundRef.current.setPositionAsync(newPosition);
      }
    } catch (error) {
      console.error('[AudioPlayer] ❌ Error skipping backward:', error);
    }
  };

  const handleSkipForward = async () => {
    try {
      const newPosition = Math.min(duration * 1000, (currentTime + 15) * 1000); // Convert to milliseconds
      console.log('[AudioPlayer] ⏩ Skipping forward to:', newPosition / 1000, 'seconds');

      if (soundRef.current) {
        await soundRef.current.setPositionAsync(newPosition);
      }
    } catch (error) {
      console.error('[AudioPlayer] ❌ Error skipping forward:', error);
    }
  };

  const handleSpeedChange = async () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];

    try {
      console.log('[AudioPlayer] 🏃 Changing speed to:', nextSpeed + 'x');

      if (soundRef.current) {
        await soundRef.current.setRateAsync(nextSpeed, true);
      }
      setPlaybackSpeed(nextSpeed);
    } catch (error) {
      console.error('[AudioPlayer] ❌ Error changing speed:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentProgress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isBuffering = isLoading || isGeneratingAudio;

  return (
    <View style={styles.container}>

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
          onPress={isPlaying ? handlePause : handlePlay}
          disabled={isBuffering}
        >
          {isBuffering ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons
              name={isPlaying ? "pause" : "play"}
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
