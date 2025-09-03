import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { ttsService } from '../services/ttsService';

interface SimpleStreamingAudioPlayerProps {
    transcript: string;
    title?: string;
    voice?: 'sage' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
    onProgressUpdate?: (progress: number, position: number) => void;
    onComplete?: () => void;
    autoPlay?: boolean;
}

/**
 * Simple Streaming Audio Player
 * Works like video streaming - single continuous stream with progressive loading
 */
export const SimpleStreamingAudioPlayer: React.FC<SimpleStreamingAudioPlayerProps> = ({
    transcript,
    title,
    voice = 'sage',
    onProgressUpdate,
    onComplete,
    autoPlay = false,
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);

    const soundRef = useRef<Audio.Sound | null>(null);
    const progressInterval = useRef<NodeJS.Timeout | null>(null);

    // Initialize Audio
    useEffect(() => {
        const setupAudio = async () => {
            try {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    staysActiveInBackground: false,
                    playsInSilentModeIOS: true,
                    shouldDuckAndroid: true,
                    playThroughEarpieceAndroid: false,
                });
                console.log('[SimpleStreamingAudioPlayer] 🎵 Audio mode configured');
            } catch (error) {
                console.error('[SimpleStreamingAudioPlayer] ❌ Error setting up audio:', error);
            }
        };

        setupAudio();

        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync().catch(console.error);
            }
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
            }
        };
    }, []);

    // Generate and load audio when needed
    useEffect(() => {
        if (transcript && (autoPlay || hasUserInteracted)) {
            generateAndLoadAudio();
        }
    }, [transcript, autoPlay, hasUserInteracted]);

    const generateAndLoadAudio = async () => {
        if (isLoading) return;

        try {
            setIsLoading(true);
            setError(null);
            console.log('[SimpleStreamingAudioPlayer] 🔄 Generating streaming audio...');

            // Generate audio URL
            const audioUrl = await ttsService.generateStreamingAudio(transcript, {
                voice,
                speed: playbackSpeed,
                onLoadStart: () => {
                    console.log('[SimpleStreamingAudioPlayer] 🔄 TTS generation started');
                },
                onProgress: (loaded, total) => {
                    console.log(`[SimpleStreamingAudioPlayer] 📊 TTS progress: ${((loaded / total) * 100).toFixed(1)}%`);
                },
                onCanPlay: () => {
                    console.log('[SimpleStreamingAudioPlayer] ✅ Audio ready for streaming');
                },
                onError: (err) => {
                    console.error('[SimpleStreamingAudioPlayer] ❌ TTS error:', err);
                    throw err;
                },
            });

            console.log('[SimpleStreamingAudioPlayer] 🎵 Audio URL generated, loading...');

            // Load audio with streaming optimization
            const { sound } = await Audio.Sound.createAsync(
                { uri: audioUrl },
                {
                    shouldPlay: false,
                    isLooping: false,
                    rate: playbackSpeed,
                    progressUpdateIntervalMillis: 1000,
                },
                // Status update callback for real-time feedback
                (status) => {
                    if (status.isLoaded) {
                        // Update duration and position
                        if (status.durationMillis) {
                            setDuration(status.durationMillis / 1000);
                        }
                        if (status.positionMillis !== undefined) {
                            setCurrentTime(status.positionMillis / 1000);

                            // Update progress
                            if (status.durationMillis && status.durationMillis > 0) {
                                const progress = (status.positionMillis / status.durationMillis) * 100;
                                onProgressUpdate?.(progress, status.positionMillis / 1000);
                            }
                        }

                        // Handle playback completion
                        if (status.didJustFinish) {
                            console.log('[SimpleStreamingAudioPlayer] 🏁 Playback completed');
                            setIsPlaying(false);
                            onComplete?.();
                        }
                    }
                }
            );

            soundRef.current = sound;
            console.log('[SimpleStreamingAudioPlayer] ✅ Audio loaded and ready for streaming');

            // Auto-play if enabled
            if (autoPlay) {
                await handlePlay();
            }

        } catch (err) {
            console.error('[SimpleStreamingAudioPlayer] ❌ Error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load audio');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlay = async () => {
        try {
            setHasUserInteracted(true);

            if (!soundRef.current) {
                console.log('[SimpleStreamingAudioPlayer] 🔄 No audio loaded, generating...');
                await generateAndLoadAudio();
                return;
            }

            console.log('[SimpleStreamingAudioPlayer] ▶️ Starting playback...');
            await soundRef.current.playAsync();
            setIsPlaying(true);

        } catch (err) {
            console.error('[SimpleStreamingAudioPlayer] ❌ Play error:', err);
            setError('Failed to play audio');
        }
    };

    const handlePause = async () => {
        try {
            if (soundRef.current) {
                await soundRef.current.pauseAsync();
            }
            setIsPlaying(false);
        } catch (err) {
            console.error('[SimpleStreamingAudioPlayer] ❌ Pause error:', err);
        }
    };

    const handleSeek = async (value: number) => {
        try {
            if (soundRef.current && duration > 0) {
                const seekPosition = (value / 100) * duration * 1000; // Convert to milliseconds
                await soundRef.current.setPositionAsync(seekPosition);
            }
        } catch (error) {
            console.error('[SimpleStreamingAudioPlayer] ❌ Seek error:', error);
        }
    };

    const handleSpeedChange = async () => {
        const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
        const currentIndex = speeds.indexOf(playbackSpeed);
        const nextSpeed = speeds[(currentIndex + 1) % speeds.length];

        try {
            if (soundRef.current) {
                await soundRef.current.setRateAsync(nextSpeed, true);
            }
            setPlaybackSpeed(nextSpeed);
        } catch (error) {
            console.error('[SimpleStreamingAudioPlayer] ❌ Speed change error:', error);
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const currentProgress = duration > 0 ? (currentTime / duration) * 100 : 0;

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
                    disabled={isLoading || !soundRef.current}
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
                {/* Play/Pause */}
                <TouchableOpacity
                    style={[styles.playButton, isLoading && styles.playButtonDisabled]}
                    onPress={isPlaying ? handlePause : handlePlay}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <Ionicons
                            name={isPlaying ? "pause" : "play"}
                            size={28}
                            color="white"
                        />
                    )}
                </TouchableOpacity>

                {/* Speed Control */}
                <TouchableOpacity
                    style={styles.speedButton}
                    onPress={handleSpeedChange}
                    disabled={isLoading}
                >
                    <Text style={[styles.speedText, isLoading && styles.speedTextDisabled]}>
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
});