import { ttsService } from '../ttsService';

/**
 * Test function to verify TTS generation and audio playback
 * This can be called from the lesson screen for testing purposes
 */
export const testAudioGeneration = async () => {
  try {
    console.log('Testing TTS audio generation...');
    
    const testText = `Welcome to this lesson on Introduction to Languages. Today we'll explore the fundamental concepts that make this subject so fascinating.

Let's begin by understanding the core principles. These are essential building blocks that will help you grasp more complex ideas later on.

The first principle involves understanding basic vocabulary and sentence structure. This forms the foundation for effective communication.

Next, we'll examine grammar patterns and how they connect different concepts together. This systematic approach helps learners build confidence.

Finally, we'll practice with real examples to reinforce what you've learned today.`;

    // Test basic TTS generation
    console.log('Generating audio with TTS service...');
    const startTime = Date.now();
    
    const audioUrl = await ttsService.generateAudio(testText, {
      voice: 'sage',
      speed: 1.0,
      format: 'mp3',
      quality: 'standard'
    });
    
    const endTime = Date.now();
    console.log(`Audio generated in ${endTime - startTime}ms`);
    console.log('Audio URL:', audioUrl);
    
    // Test cache statistics
    const cacheStats = ttsService.getCacheStats();
    console.log('Cache statistics:', cacheStats);
    
    // Test availability
    const isAvailable = await ttsService.checkAvailability();
    console.log('TTS service available:', isAvailable);
    
    return {
      success: true,
      audioUrl,
      generationTime: endTime - startTime,
      cacheStats,
      isAvailable
    };
    
  } catch (error) {
    console.error('Audio test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Test transcript parsing functionality
 */
export const testTranscriptParsing = (transcript: string, duration: number) => {
  console.log('Testing transcript parsing...');
  
  // Parse transcript into segments (same logic as lesson screen)
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const segmentDuration = duration / sentences.length;
  
  const segments = sentences.map((sentence, index) => ({
    start: index * segmentDuration,
    end: (index + 1) * segmentDuration,
    text: sentence.trim() + (index < sentences.length - 1 ? '.' : ''),
  }));
  
  console.log('Parsed segments:', segments);
  console.log('Number of segments:', segments.length);
  console.log('Average segment duration:', segmentDuration);
  
  return segments;
};

/**
 * Test progress tracking calculations
 */
export const testProgressTracking = (position: number, duration: number) => {
  console.log('Testing progress tracking...');
  
  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;
  
  console.log(`Position: ${position}s, Duration: ${duration}s`);
  console.log(`Progress: ${progressPercentage.toFixed(1)}%`);
  
  return {
    position,
    duration,
    progressPercentage,
    isComplete: progressPercentage >= 100
  };
};
