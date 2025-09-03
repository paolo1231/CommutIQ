import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { ENV } from '../constants';

/**
 * TTS Service optimized for React Native
 * Handles text-to-speech conversion with automatic chunking and caching
 */
export class TTSService {
  private static instance: TTSService;
  private readonly MAX_CHUNK_SIZE = 3900; // Leave buffer for OpenAI's 4096 limit
  private readonly CACHE_DIR = `${FileSystem.cacheDirectory}tts/`;
  private cache = new Map<string, string>();

  private constructor() {
    this.initializeCache();
  }

  static getInstance(): TTSService {
    if (!TTSService.instance) {
      TTSService.instance = new TTSService();
    }
    return TTSService.instance;
  }

  private async initializeCache() {
    try {
      // Create cache directory if it doesn't exist (React Native only)
      if (Platform.OS !== 'web') {
        const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });
        }
      }
    } catch (error) {
      console.log('Cache initialization error:', error);
    }
  }

  /**
   * Main method to generate audio from text
   * Automatically handles chunking for long texts and caching
   */
  async generateAudio(
    text: string,
    options: {
      voice?: 'sage' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
      speed?: number;
    } = {}
  ): Promise<string> {
    const { voice = 'sage', speed = 1.0 } = options;

    console.log(`[TTS Service] 🎵 generateAudio called - text: ${text.length} chars, voice: ${voice}, speed: ${speed}x`);

    if (!text || text.trim().length === 0) {
      throw new Error('Text is required');
    }

    // Check cache first
    const cacheKey = this.getCacheKey(text, voice, speed);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('TTS: Cache hit for key:', cacheKey);
      return cached;
    }

    console.log(`[TTS Service] 🔄 Cache miss, generating new audio...`);

    try {
      let audioUrl: string;

      // Use Edge Function for all platforms (unified approach)
      if (ENV.SUPABASE_URL && ENV.SUPABASE_ANON_KEY) {
        console.log(`[TTS Service] 🌐 Using Edge Function approach`);
        audioUrl = await this.generateViaEdgeFunction(text, voice, speed);
      } else if (ENV.OPENAI_API_KEY) {
        console.log('TTS: Using direct OpenAI API approach');
        // Fallback to direct OpenAI API if Edge Function not available
        audioUrl = await this.generateViaOpenAI(text, voice, speed);
      } else {
        throw new Error('No TTS service configured. Please set up Supabase Edge Function or OpenAI API key.');
      }

      console.log(`[TTS Service] ✅ Audio generated successfully, URL: ${audioUrl.substring(0, 50)}...`);

      // Cache the result
      this.cache.set(cacheKey, audioUrl);
      console.log('TTS: Cached result with key:', cacheKey);

      // On React Native, also cache to file system for persistence
      if (Platform.OS !== 'web') {
        this.cacheToFileSystem(cacheKey, audioUrl).catch(console.error);
      }

      return audioUrl;
    } catch (error) {
      console.error('TTS generation error:', error);
      throw error;
    }
  }

  /**
   * Generate audio via Supabase Edge Function
   */
  private async generateViaEdgeFunction(text: string, voice: string, speed: number): Promise<string> {
    console.log('TTS: Calling Edge Function with text length:', text.length);

    const response = await fetch(`${ENV.SUPABASE_URL}/functions/v1/tts-stream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ENV.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, voice, speed }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('TTS: Edge Function error:', error);
      throw new Error(`Edge Function error: ${error}`);
    }

    // Handle response based on platform
    if (Platform.OS === 'web') {
      // For web, create blob URL
      const blob = await response.blob();
      console.log('TTS: Created blob:', blob.size, 'bytes, type:', blob.type);
      const blobUrl = URL.createObjectURL(blob);
      console.log('TTS: Created blob URL:', blobUrl.substring(0, 50) + '...');
      return blobUrl;
    } else {
      // For React Native, convert to base64 data URI
      const arrayBuffer = await response.arrayBuffer();
      const base64 = this.arrayBufferToBase64(arrayBuffer);
      console.log('TTS: Converted to base64, length:', base64.length);

      // Save to temporary file for better performance
      const fileUri = await this.saveBase64ToFile(base64);
      console.log('TTS: Saved to file:', fileUri);
      return fileUri;
    }
  }

  /**
   * Generate streaming audio by chunking the text and creating multiple audio segments
   * This allows playback to start with the first chunk while others are loading
   */
  async generateStreamingAudio(
    text: string,
    options: {
      voice?: 'sage' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
      speed?: number;
      onProgress?: (loaded: number, total: number) => void;
      onCanPlay?: () => void;
      onLoadStart?: () => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<string> {
    const { voice = 'sage', speed = 1.0, onProgress, onCanPlay, onLoadStart, onError } = options;

    console.log(`[TTS Service] 🌊 generateStreamingAudio called - text: ${text.length} chars, voice: ${voice}, speed: ${speed}x`);

    // Call the callbacks to provide feedback
    onLoadStart?.();

    try {
      // For React Native, return the streaming URL directly
      // This allows Expo AV to handle progressive loading
      console.log(`[TTS Service] 📱 Creating streaming URL for React Native`);

      // Create a streaming URL with authentication headers
      const streamingUrl = `${ENV.SUPABASE_URL}/functions/v1/tts-stream`;

      console.log(`[TTS Service] 🌊 Streaming URL created: ${streamingUrl}`);

      // Test the URL first to make sure it's accessible
      const testResponse = await fetch(streamingUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ENV.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text.substring(0, 100) + '...', voice, speed }),
      });

      if (!testResponse.ok) {
        throw new Error(`Streaming URL not accessible: ${testResponse.status}`);
      }

      // For now, we still need to use the file-based approach for Expo AV
      // because Expo AV doesn't support streaming from POST requests with auth headers
      console.log(`[TTS Service] 📱 Using file-based approach for Expo AV compatibility`);
      const url = await this.generateViaEdgeFunction(text, voice, speed);

      // Provide progress feedback
      onProgress?.(1, 1);
      onCanPlay?.();

      return url;
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Streaming audio generation failed'));
      throw error;
    }
  }

  /**
   * Generate streaming audio by creating the first chunk immediately
   * This allows playback to start quickly while the full audio generates in background
   */
  async generateStreamingAudioChunked(
    text: string,
    options: {
      voice?: 'sage' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
      speed?: number;
      onProgress?: (loaded: number, total: number) => void;
      onCanPlay?: () => void;
      onLoadStart?: () => void;
      onError?: (error: Error) => void;
      onChunkReady?: (chunkUrl: string, chunkIndex: number, totalChunks: number) => void;
    } = {}
  ): Promise<{
    firstChunkUrl: string;
    textChunks: string[];
    totalChunks: number;
  }> {
    const { voice = 'sage', speed = 1.0, onProgress, onCanPlay, onLoadStart, onError } = options;

    console.log(`[TTS Service] 🎬 generateStreamingAudioChunked - text: ${text.length} chars`);
    onLoadStart?.();

    try {
      // Split text into smaller chunks for faster initial playback
      const chunks = this.splitTextIntoStreamingChunks(text, 500);
      console.log(`[TTS Service] 📝 Split into ${chunks.length} streaming chunks`);

      if (chunks.length === 1) {
        // Single chunk, use normal method
        const url = await this.generateViaEdgeFunction(text, voice, speed);
        onProgress?.(1, 1);
        onCanPlay?.();
        return {
          firstChunkUrl: url,
          textChunks: chunks,
          totalChunks: 1
        };
      }

      // Generate first chunk immediately for quick playback
      console.log(`[TTS Service] 🚀 Generating first chunk (${chunks[0].length} chars) for immediate playback...`);
      const firstChunkUrl = await this.generateViaEdgeFunction(chunks[0], voice, speed);

      onProgress?.(1, chunks.length);
      onCanPlay?.();

      console.log(`[TTS Service] ✅ First chunk ready, remaining ${chunks.length - 1} chunks will be generated on demand`);

      return {
        firstChunkUrl,
        textChunks: chunks,
        totalChunks: chunks.length
      };

    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Streaming audio generation failed'));
      throw error;
    }
  }

  /**
   * Generate a specific chunk by index
   */
  async generateChunkByIndex(
    textChunks: string[],
    chunkIndex: number,
    voice: string = 'sage',
    speed: number = 1.0
  ): Promise<string> {
    if (chunkIndex >= textChunks.length) {
      throw new Error(`Chunk index ${chunkIndex} out of range (max: ${textChunks.length - 1})`);
    }

    const chunk = textChunks[chunkIndex];
    console.log(`[TTS Service] 🔄 Generating chunk ${chunkIndex + 1}/${textChunks.length} (${chunk.length} chars)...`);

    const chunkUrl = await this.generateViaEdgeFunction(chunk, voice, speed);
    console.log(`[TTS Service] ✅ Chunk ${chunkIndex + 1}/${textChunks.length} ready`);

    return chunkUrl;
  }

  /**
   * Split text into smaller chunks optimized for streaming
   */
  private splitTextIntoStreamingChunks(text: string, maxChunkSize: number = 500): string[] {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let currentChunk = '';

    // Split by sentences first
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        // If single sentence is too long, split by phrases
        if (sentence.length > maxChunkSize) {
          const phrases = sentence.split(/[,;]/);
          let phraseChunk = '';

          for (const phrase of phrases) {
            if (phraseChunk.length + phrase.length > maxChunkSize) {
              if (phraseChunk) chunks.push(phraseChunk.trim());
              phraseChunk = phrase;
            } else {
              phraseChunk += (phraseChunk ? ',' : '') + phrase;
            }
          }

          if (phraseChunk) currentChunk = phraseChunk;
        } else {
          currentChunk = sentence;
        }
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Create a streaming audio element that supports progressive playback
   * This method sets up an audio element that can start playing before full download
   */
  private async createStreamingAudioElement(
    text: string,
    options: {
      voice?: string;
      speed?: number;
      onProgress?: (loaded: number, total: number) => void;
      onCanPlay?: () => void;
      onLoadStart?: () => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<HTMLAudioElement> {
    const { voice = 'sage', speed = 1.0, onProgress, onCanPlay, onLoadStart, onError } = options;

    console.log(`[TTS Service] 🎧 Creating streaming audio element...`);

    // Create audio element with streaming optimizations
    const audio = new Audio();
    audio.preload = 'auto'; // Enable progressive loading
    audio.crossOrigin = 'anonymous'; // Allow cross-origin streaming

    // Set up event listeners for streaming progress
    audio.addEventListener('loadstart', () => {
      console.log('TTS: Audio load started - beginning to fetch data');
      onLoadStart?.();
    });

    audio.addEventListener('progress', () => {
      if (audio.buffered.length > 0) {
        const loaded = audio.buffered.end(0);
        const total = audio.duration || 0;
        console.log(`TTS: Audio progress - buffered: ${loaded.toFixed(1)}s / ${total.toFixed(1)}s`);
        onProgress?.(loaded, total);
      }
    });

    audio.addEventListener('canplay', () => {
      console.log('TTS: Audio can play - enough data buffered for playback');
      onCanPlay?.();
    });

    audio.addEventListener('canplaythrough', () => {
      console.log('TTS: Audio can play through - enough data for uninterrupted playback');
    });

    audio.addEventListener('error', (e) => {
      const error = new Error(`Audio streaming error: ${audio.error?.message || 'Unknown error'}`);
      console.error('TTS: Audio streaming error:', error);
      onError?.(error);
    });

    // Start the streaming fetch
    try {
      console.log('TTS: Starting streaming fetch...');
      const response = await fetch(`${ENV.SUPABASE_URL}/functions/v1/tts-stream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ENV.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voice, speed }),
      });

      if (!response.ok) {
        throw new Error(`TTS streaming error: ${response.status} - ${response.statusText}`);
      }

      // Create blob URL from response - this enables progressive loading
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      console.log('TTS: Created streaming blob URL:', blobUrl.substring(0, 50) + '...');
      console.log('TTS: Blob size:', blob.size, 'bytes, type:', blob.type);

      // Set the source - this will trigger progressive loading
      audio.src = blobUrl;

      // The audio element will now start loading and can begin playback
      // as soon as enough data is buffered (canplay event)

      return audio;
    } catch (error) {
      const streamingError = error instanceof Error ? error : new Error('Failed to create streaming audio');
      console.error('TTS: Streaming setup error:', streamingError);
      onError?.(streamingError);
      throw streamingError;
    }
  }

  /**
   * Generate audio via direct OpenAI API call
   */
  private async generateViaOpenAI(text: string, voice: string, speed: number): Promise<string> {
    // Split text into chunks if needed
    const chunks = this.splitTextIntoChunks(text);

    if (chunks.length === 1) {
      // Single chunk, direct processing
      return await this.processChunk(chunks[0], voice, speed);
    } else {
      // Multiple chunks, need to process and combine
      console.log(`Processing ${chunks.length} chunks`);
      const audioUrls = await Promise.all(
        chunks.map(chunk => this.processChunk(chunk, voice, speed))
      );

      // For now, return the first chunk (audio concatenation is complex)
      // In production, you'd want to properly concatenate audio files
      console.warn('Multiple chunks generated, returning first chunk only. Audio concatenation not yet implemented.');
      return audioUrls[0];
    }
  }

  /**
   * Process a single text chunk via OpenAI API
   */
  private async processChunk(text: string, voice: string, speed: number): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ENV.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice,
        response_format: 'mp3',
        speed: speed,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    // Handle response based on platform
    if (Platform.OS === 'web') {
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } else {
      const arrayBuffer = await response.arrayBuffer();
      const base64 = this.arrayBufferToBase64(arrayBuffer);
      return await this.saveBase64ToFile(base64);
    }
  }

  /**
   * Split text into chunks that respect OpenAI's character limit
   */
  private splitTextIntoChunks(text: string): string[] {
    if (text.length <= this.MAX_CHUNK_SIZE) {
      return [text];
    }

    const chunks: string[] = [];
    let currentChunk = '';

    // Split by sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > this.MAX_CHUNK_SIZE) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        // If single sentence is too long, split by words
        if (sentence.length > this.MAX_CHUNK_SIZE) {
          const words = sentence.split(/\s+/);
          let wordChunk = '';

          for (const word of words) {
            if (wordChunk.length + word.length + 1 > this.MAX_CHUNK_SIZE) {
              if (wordChunk) chunks.push(wordChunk.trim());
              wordChunk = word;
            } else {
              wordChunk += (wordChunk ? ' ' : '') + word;
            }
          }

          if (wordChunk) currentChunk = wordChunk;
        } else {
          currentChunk = sentence;
        }
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Save base64 audio to file (React Native)
   */
  private async saveBase64ToFile(base64: string): Promise<string> {
    const filename = `audio_${Date.now()}.mp3`;
    const fileUri = this.CACHE_DIR + filename;

    try {
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return fileUri;
    } catch (error) {
      console.error('Error saving audio file:', error);
      // Fallback to data URI
      return `data:audio/mp3;base64,${base64}`;
    }
  }

  /**
   * Cache audio to file system for persistence
   */
  private async cacheToFileSystem(cacheKey: string, audioUrl: string) {
    if (Platform.OS === 'web') return;

    try {
      const cacheFile = this.CACHE_DIR + cacheKey + '.json';
      await FileSystem.writeAsStringAsync(cacheFile, JSON.stringify({
        url: audioUrl,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode(...chunk);
    }

    if (typeof btoa !== 'undefined') {
      return btoa(binary);
    } else if (typeof Buffer !== 'undefined') {
      return Buffer.from(binary, 'binary').toString('base64');
    } else {
      throw new Error('Base64 encoding not available');
    }
  }

  /**
   * Generate cache key
   */
  private getCacheKey(text: string, voice: string, speed: number): string {
    const hash = this.simpleHash(text);
    return `tts_${hash}_${voice}_${speed}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Clean up cached audio files
   */
  async cleanupCache() {
    // Clear memory cache
    this.cache.clear();

    // Clear file system cache (React Native)
    if (Platform.OS !== 'web') {
      try {
        await FileSystem.deleteAsync(this.CACHE_DIR, { idempotent: true });
        await this.initializeCache();
      } catch (error) {
        console.error('Cache cleanup error:', error);
      }
    }

    // Clear blob URLs (web)
    if (Platform.OS === 'web') {
      this.cache.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    }
  }

  /**
   * Preload audio for text
   */
  async preload(text: string, options = {}) {
    try {
      await this.generateAudio(text, options);
      console.log('Audio preloaded successfully');
    } catch (error) {
      console.error('Preload error:', error);
    }
  }

  /**
   * Preload multiple texts in parallel
   */
  async preloadMultiple(
    texts: Array<{ text: string; options?: any }>,
    maxConcurrent: number = 3
  ): Promise<void> {
    const chunks = [];
    for (let i = 0; i < texts.length; i += maxConcurrent) {
      chunks.push(texts.slice(i, i + maxConcurrent));
    }

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(item => this.preload(item.text, item.options))
      );
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hits: number; misses: number } {
    return {
      size: this.cache.size,
      hits: 0, // Would need to track this
      misses: 0 // Would need to track this
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cleanupCache();
  }

  /**
   * Check TTS service availability
   */
  async checkAvailability(): Promise<boolean> {
    try {
      // Quick test with minimal text
      await this.generateAudio('Test', { voice: 'sage' });
      return true;
    } catch (error) {
      console.error('TTS availability check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const ttsService = TTSService.getInstance();
