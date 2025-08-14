import React, { useEffect, useRef, useState } from 'react';
import { contentGenerationService } from '../services/contentGenerationService';

interface AudioPlayerProps {
    transcript: string;
    title?: string;
    voice?: string;
    useClientSideTTS?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
    transcript,
    title,
    voice = 'sage',
    useClientSideTTS = false
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const playWithClientTTS = async () => {
        try {
            setIsLoading(true);
            setError(null);
            setIsPlaying(true);

            await contentGenerationService.generateClientSideTTS(transcript, {
                voice: voice,
                rate: 1.0,
                pitch: 1.0,
                volume: 1.0
            });

            setIsPlaying(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to play audio');
            setIsPlaying(false);
        } finally {
            setIsLoading(false);
        }
    };

    const playWithStreamingTTS = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Get streaming audio blob URL from Supabase Edge Function
            const blobUrl = await contentGenerationService.generateStreamingAudioUrl(transcript, voice);

            if (audioRef.current) {
                audioRef.current.src = blobUrl;
                await audioRef.current.play();
                setIsPlaying(true);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load audio');
            setIsPlaying(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlay = () => {
        if (useClientSideTTS) {
            playWithClientTTS();
        } else {
            playWithStreamingTTS();
        }
    };

    const handleStop = () => {
        if (useClientSideTTS) {
            speechSynthesis.cancel();
        } else if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;

            // Clean up blob URL to prevent memory leaks
            if (audioRef.current.src.startsWith('blob:')) {
                URL.revokeObjectURL(audioRef.current.src);
            }
        }
        setIsPlaying(false);
    };

    const handleAudioEnd = () => {
        setIsPlaying(false);

        // Clean up blob URL when audio ends
        if (audioRef.current?.src.startsWith('blob:')) {
            URL.revokeObjectURL(audioRef.current.src);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current?.src.startsWith('blob:')) {
                URL.revokeObjectURL(audioRef.current.src);
            }
        };
    }, []);

    return (
        <div className="audio-player">
            {title && <h3>{title}</h3>}

            <div className="controls">
                {!isPlaying ? (
                    <button
                        onClick={handlePlay}
                        disabled={isLoading}
                        className="play-button"
                    >
                        {isLoading ? 'Loading...' : '▶️ Play'}
                    </button>
                ) : (
                    <button
                        onClick={handleStop}
                        className="stop-button"
                    >
                        ⏹️ Stop
                    </button>
                )}
            </div>

            {error && (
                <div className="error-message" style={{ color: 'red', marginTop: '8px' }}>
                    {error}
                </div>
            )}

            {/* Hidden audio element for streaming TTS */}
            {!useClientSideTTS && (
                <audio
                    ref={audioRef}
                    onEnded={handleAudioEnd}
                    onError={() => setError('Audio playback failed')}
                    style={{ display: 'none' }}
                />
            )}

            {/* Transcript display */}
            <details className="transcript" style={{ marginTop: '16px' }}>
                <summary>Show Transcript</summary>
                <div style={{
                    marginTop: '8px',
                    padding: '12px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    fontSize: '14px',
                    lineHeight: '1.5'
                }}>
                    {transcript}
                </div>
            </details>
        </div>
    );
};