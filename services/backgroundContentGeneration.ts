/**
 * Background Content Generation Service
 * Handles content generation that happens after onboarding to improve user experience
 */

import { Subject } from '../types';
import { contentGenerationService } from './contentGenerationService';
import { supabaseService } from './supabaseService';

export class BackgroundContentGenerationService {
    private isGenerating = false;
    private generationQueue: Array<{
        userId: string;
        subjectId: string;
        commuteTime: number;
        difficulty: 'beginner' | 'intermediate' | 'advanced';
        priority: number;
    }> = [];

    /**
     * Queue content generation for later processing
     */
    async queueContentGeneration(
        userId: string,
        subjects: Subject[],
        commuteTime: number,
        difficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
    ) {
        console.log(`Queueing content generation for ${subjects.length} subjects`);

        // Add subjects to generation queue with priority
        subjects.forEach((subject, index) => {
            this.generationQueue.push({
                userId,
                subjectId: subject.id,
                commuteTime,
                difficulty,
                priority: index + 1, // First selected subjects get higher priority
            });
        });

        // Sort queue by priority
        this.generationQueue.sort((a, b) => a.priority - b.priority);

        // Start processing if not already running
        if (!this.isGenerating) {
            this.processQueue();
        }
    }

    /**
     * Process the content generation queue
     */
    private async processQueue() {
        if (this.isGenerating || this.generationQueue.length === 0) {
            return;
        }

        this.isGenerating = true;
        console.log(`Starting background content generation. Queue size: ${this.generationQueue.length}`);

        while (this.generationQueue.length > 0) {
            const item = this.generationQueue.shift();
            if (!item) continue;

            try {
                console.log(`Generating course for subject ${item.subjectId}...`);

                // Check if course already exists for this user and subject
                const existingCourses = await supabaseService.getUserCourses(item.userId);
                const hasExistingCourse = existingCourses.data?.some(
                    course => course.subject_id === item.subjectId
                );

                if (hasExistingCourse) {
                    console.log(`Course already exists for subject ${item.subjectId}, skipping`);
                    continue;
                }

                // Generate the course
                const course = await contentGenerationService.generateCourse({
                    subject_id: item.subjectId,
                    user_id: item.userId,
                    commute_time: item.commuteTime,
                    difficulty: item.difficulty,
                });

                console.log(`Successfully generated background course: ${course.title}`);

                // Add a small delay to avoid overwhelming the API
                await this.delay(2000);
            } catch (error) {
                console.error(`Background generation failed for subject ${item.subjectId}:`, error);

                // Try fallback generation
                try {
                    const subject = await supabaseService.getSubjectById(item.subjectId);
                    if (subject) {
                        const fallbackCourse = await contentGenerationService.generateFallbackCourse(
                            subject,
                            item.commuteTime,
                            item.userId
                        );
                        console.log(`Generated fallback course: ${fallbackCourse.title}`);
                    }
                } catch (fallbackError) {
                    console.error(`Fallback generation also failed:`, fallbackError);
                }

                // Add delay even on failure to avoid rapid retries
                await this.delay(1000);
            }
        }

        this.isGenerating = false;
        console.log('Background content generation completed');
    }

    /**
     * Generate additional courses for existing users
     */
    async generateAdditionalCourses(userId: string, newSubjectIds: string[], commuteTime: number) {
        console.log(`Generating additional courses for ${newSubjectIds.length} new subjects`);

        const results = [];

        for (const subjectId of newSubjectIds) {
            try {
                // Check if course already exists
                const existingCourses = await supabaseService.getUserCourses(userId);
                const hasExistingCourse = existingCourses.data?.some(
                    course => course.subject_id === subjectId
                );

                if (hasExistingCourse) {
                    console.log(`Course already exists for subject ${subjectId}, skipping`);
                    continue;
                }

                const course = await contentGenerationService.generateCourse({
                    subject_id: subjectId,
                    user_id: userId,
                    commute_time: commuteTime,
                    difficulty: 'beginner',
                });

                results.push({ success: true, course, subjectId });
                console.log(`Generated additional course: ${course.title}`);
            } catch (error) {
                console.error(`Failed to generate additional course for subject ${subjectId}:`, error);
                results.push({ success: false, error: error.message, subjectId });
            }
        }

        return results;
    }

    /**
     * Regenerate courses with updated preferences
     */
    async regenerateCoursesForUpdatedPreferences(
        userId: string,
        newCommuteTime: number,
        newDifficulty?: 'beginner' | 'intermediate' | 'advanced'
    ) {
        console.log(`Regenerating courses for updated preferences: ${newCommuteTime}min, ${newDifficulty || 'same difficulty'}`);

        try {
            // Get user's current courses
            const coursesResult = await supabaseService.getUserCourses(userId);
            if (!coursesResult.data) {
                console.log('No existing courses found');
                return;
            }

            const courses = coursesResult.data;
            console.log(`Found ${courses.length} existing courses to potentially regenerate`);

            // Only regenerate if commute time changed significantly (more than 10 minutes difference)
            const shouldRegenerate = courses.some(course =>
                Math.abs((course.estimated_duration / course.total_lessons) - newCommuteTime) > 10
            );

            if (!shouldRegenerate && !newDifficulty) {
                console.log('No significant changes detected, skipping regeneration');
                return;
            }

            // Queue regeneration for each subject
            for (const course of courses) {
                if (course.subject_id) {
                    this.generationQueue.push({
                        userId,
                        subjectId: course.subject_id,
                        commuteTime: newCommuteTime,
                        difficulty: newDifficulty || 'beginner',
                        priority: 999, // Lower priority than new courses
                    });
                }
            }

            // Start processing
            if (!this.isGenerating) {
                this.processQueue();
            }
        } catch (error) {
            console.error('Failed to regenerate courses for updated preferences:', error);
        }
    }

    /**
     * Get current generation status
     */
    getGenerationStatus() {
        return {
            isGenerating: this.isGenerating,
            queueSize: this.generationQueue.length,
            currentItem: this.generationQueue[0] || null,
        };
    }

    /**
     * Clear the generation queue
     */
    clearQueue() {
        this.generationQueue = [];
        console.log('Content generation queue cleared');
    }

    /**
     * Utility method to add delay
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Generate sample/demo courses for new users
     */
    async generateDemoCourses(userId: string, commuteTime: number) {
        console.log('Generating demo courses for new user');

        const demoSubjects = ['languages', 'history']; // Popular subjects for demo

        try {
            const { data: allSubjects } = await supabaseService.getAllSubjects();
            if (!allSubjects) return;

            const subjectsToGenerate = allSubjects.filter(subject =>
                demoSubjects.includes(subject.name.toLowerCase()) && !subject.is_premium
            );

            for (const subject of subjectsToGenerate) {
                try {
                    const course = await contentGenerationService.generateCourse({
                        subject_id: subject.id,
                        user_id: userId,
                        commute_time: commuteTime,
                        difficulty: 'beginner',
                    });

                    console.log(`Generated demo course: ${course.title}`);
                } catch (error) {
                    console.error(`Failed to generate demo course for ${subject.name}:`, error);
                }
            }
        } catch (error) {
            console.error('Failed to generate demo courses:', error);
        }
    }

    /**
     * Preload popular courses for faster onboarding
     */
    async preloadPopularCourses() {
        console.log('Preloading popular courses...');

        // This would typically be called during app initialization
        // to pre-generate courses for popular subjects

        const popularSubjects = ['languages', 'programming', 'history'];
        const commonCommuteTimes = [15, 30, 45];

        // In a real implementation, you might want to:
        // 1. Generate courses for anonymous/template users
        // 2. Cache the generated content
        // 3. Clone/customize for actual users during onboarding

        console.log('Popular course preloading would happen here in production');
    }
}

// Export singleton instance
export const backgroundContentGenerationService = new BackgroundContentGenerationService();