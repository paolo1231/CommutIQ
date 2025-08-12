/**
 * Example usage of ContentGenerationService
 * This file demonstrates how to use the content generation service
 */

import { SUBJECTS_CONFIG } from '../constants';
import { contentGenerationService } from './contentGenerationService';
import { supabaseService } from './supabaseService';

/**
 * Example: Generate a course for a user
 */
export async function generateExampleCourse(userId: string, commuteTime: number = 30) {
    try {
        console.log('Starting course generation example...');

        // Get the first available subject (Languages)
        const subject = SUBJECTS_CONFIG.find(s => s.id === 'languages');
        if (!subject) {
            throw new Error('Subject not found');
        }

        // Create the subject in database if it doesn't exist
        const { data: subjects } = await supabaseService.getAllSubjects();
        let dbSubject = subjects?.find(s => s.name === subject.name);

        if (!dbSubject) {
            // For this example, we'll assume subjects are already in the database
            console.log('Subject should be created in database first');
            return;
        }

        // Generate the course
        console.log(`Generating course for subject: ${subject.name}`);
        console.log(`Commute time: ${commuteTime} minutes`);

        const course = await contentGenerationService.generateCourse({
            subject_id: dbSubject.id,
            user_id: userId,
            commute_time: commuteTime,
            difficulty: 'beginner',
        });

        console.log('Course generated successfully:', {
            id: course.id,
            title: course.title,
            totalLessons: course.total_lessons,
            estimatedDuration: course.estimated_duration,
        });

        // Get the generated lessons
        const { data: lessons } = await supabaseService.getCourseLessons(course.id);
        console.log(`Generated ${lessons?.length || 0} lessons`);

        if (lessons && lessons.length > 0) {
            console.log('First lesson:', {
                title: lessons[0].title,
                duration: lessons[0].duration,
                hasAudio: !!lessons[0].audio_url,
            });
        }

        return course;
    } catch (error) {
        console.error('Course generation example failed:', error);

        // Try fallback generation
        console.log('Attempting fallback course generation...');
        try {
            const subject = SUBJECTS_CONFIG.find(s => s.id === 'languages');
            if (subject) {
                const fallbackCourse = await contentGenerationService.generateFallbackCourse(
                    subject as any,
                    commuteTime,
                    userId
                );
                console.log('Fallback course generated:', fallbackCourse.title);
                return fallbackCourse;
            }
        } catch (fallbackError) {
            console.error('Fallback generation also failed:', fallbackError);
        }
    }
}

/**
 * Example: Generate audio for an existing lesson
 */
export async function generateExampleAudio(lessonId: string) {
    try {
        console.log('Generating audio for lesson:', lessonId);

        const audioUrl = await contentGenerationService.regenerateLessonAudio(lessonId, 'alloy');

        console.log('Audio generated successfully:', audioUrl);
        return audioUrl;
    } catch (error) {
        console.error('Audio generation example failed:', error);
    }
}

/**
 * Example: Test OpenAI connectivity
 */
export async function testOpenAIConnection() {
    try {
        console.log('Testing OpenAI connection...');

        // Generate a simple audio sample
        const testText = "Hello! This is a test of the OpenAI text-to-speech system. If you can hear this, the integration is working correctly.";

        const audioBuffer = await contentGenerationService.generateAudio(testText);

        console.log('OpenAI TTS test successful. Audio buffer size:', audioBuffer.length);
        return true;
    } catch (error) {
        console.error('OpenAI connection test failed:', error);
        return false;
    }
}

/**
 * Example usage in a React component or service
 */
export const ContentGenerationExamples = {
    /**
     * Generate course after user completes subject selection
     */
    async onSubjectSelectionComplete(userId: string, selectedSubjectIds: string[], commuteTime: number) {
        console.log('User completed subject selection, generating courses...');

        const courses = [];

        for (const subjectId of selectedSubjectIds) {
            try {
                const course = await contentGenerationService.generateCourse({
                    subject_id: subjectId,
                    user_id: userId,
                    commute_time: commuteTime,
                    difficulty: 'beginner',
                });

                courses.push(course);
                console.log(`Generated course: ${course.title}`);
            } catch (error) {
                console.error(`Failed to generate course for subject ${subjectId}:`, error);

                // Try fallback
                try {
                    const subject = SUBJECTS_CONFIG.find(s => s.id === subjectId);
                    if (subject) {
                        const fallbackCourse = await contentGenerationService.generateFallbackCourse(
                            subject as any,
                            commuteTime,
                            userId
                        );
                        courses.push(fallbackCourse);
                        console.log(`Generated fallback course: ${fallbackCourse.title}`);
                    }
                } catch (fallbackError) {
                    console.error(`Fallback also failed for subject ${subjectId}:`, fallbackError);
                }
            }
        }

        return courses;
    },

    /**
     * Regenerate lesson content with different parameters
     */
    async regenerateLessonContent(lessonId: string, newVoice: string = 'nova') {
        try {
            const audioUrl = await contentGenerationService.regenerateLessonAudio(lessonId, newVoice);
            console.log(`Regenerated lesson audio with voice ${newVoice}:`, audioUrl);
            return audioUrl;
        } catch (error) {
            console.error('Failed to regenerate lesson content:', error);
            throw error;
        }
    },

    /**
     * Batch generate courses for multiple users (admin function)
     */
    async batchGenerateCourses(userRequests: Array<{
        userId: string;
        subjectId: string;
        commuteTime: number;
        difficulty?: 'beginner' | 'intermediate' | 'advanced';
    }>) {
        console.log(`Starting batch generation for ${userRequests.length} requests...`);

        const results = [];

        for (const request of userRequests) {
            try {
                const course = await contentGenerationService.generateCourse(request);
                results.push({ success: true, course, userId: request.userId });
            } catch (error) {
                console.error(`Batch generation failed for user ${request.userId}:`, error);
                results.push({ success: false, error: error.message, userId: request.userId });
            }
        }

        const successful = results.filter(r => r.success).length;
        const failed = results.length - successful;

        console.log(`Batch generation complete: ${successful} successful, ${failed} failed`);
        return results;
    },
};

/**
 * Utility functions for testing and debugging
 */
export const ContentGenerationUtils = {
    /**
     * Validate OpenAI API key configuration
     */
    validateConfiguration() {
        const { ENV, OPENAI_CONFIG } = require('../constants');

        const issues = [];

        if (!ENV.OPENAI_API_KEY) {
            issues.push('OPENAI_API_KEY environment variable is not set');
        }

        if (!OPENAI_CONFIG.API_URL) {
            issues.push('OpenAI API URL is not configured');
        }

        if (!OPENAI_CONFIG.MODELS.CHAT) {
            issues.push('OpenAI chat model is not configured');
        }

        if (!OPENAI_CONFIG.MODELS.TTS) {
            issues.push('OpenAI TTS model is not configured');
        }

        if (issues.length > 0) {
            console.error('Content generation configuration issues:', issues);
            return false;
        }

        console.log('Content generation configuration is valid');
        return true;
    },

    /**
     * Get estimated costs for content generation
     */
    estimateGenerationCosts(courseCount: number, lessonsPerCourse: number = 8) {
        const totalLessons = courseCount * lessonsPerCourse;

        // Rough estimates based on OpenAI pricing (as of 2024)
        const gpt4TokensPerLesson = 1500; // Average tokens for lesson generation
        const ttsCharactersPerLesson = 2000; // Average characters for TTS

        const gpt4Cost = (totalLessons * gpt4TokensPerLesson * 0.00003); // $0.03 per 1K tokens
        const ttsCost = (totalLessons * ttsCharactersPerLesson * 0.000015); // $0.015 per 1K characters

        const totalCost = gpt4Cost + ttsCost;

        console.log('Estimated generation costs:', {
            courses: courseCount,
            totalLessons,
            gpt4Cost: `$${gpt4Cost.toFixed(4)}`,
            ttsCost: `$${ttsCost.toFixed(4)}`,
            totalCost: `$${totalCost.toFixed(4)}`,
        });

        return {
            gpt4Cost,
            ttsCost,
            totalCost,
            totalLessons,
        };
    },
};