import { Course, PreGeneratedCourse, PreGeneratedLesson } from '../types';
import { preGeneratedContentService } from './preGeneratedContentService';
import { supabaseService } from './supabaseService';

/**
 * FreeUserContentService handles content access for free tier users
 * Free users get access to pre-generated courses instead of real-time AI generation
 */
export class FreeUserContentService {
    /**
     * Get available courses for a free user based on their preferences
     */
    async getAvailableCoursesForFreeUser(
        userId: string,
        subjectIds: string[],
        commuteTime: number,
        difficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
    ): Promise<{
        preGenerated: PreGeneratedCourse[];
        userCourses: Course[];
        recommendations: PreGeneratedCourse[];
    }> {
        try {
            // Get user's existing courses
            const userCoursesResponse = await supabaseService.getUserCourses(userId);
            const userCourses = userCoursesResponse.data || [];

            // Get pre-generated courses for user's subjects
            const preGeneratedCourses: PreGeneratedCourse[] = [];

            for (const subjectId of subjectIds) {
                const coursesResponse = await preGeneratedContentService.getAvailablePreGeneratedCourses(
                    subjectId,
                    commuteTime,
                    difficulty
                );
                preGeneratedCourses.push(...coursesResponse);
            }

            // Filter out courses the user already has
            const userPreGeneratedIds = new Set(
                userCourses
                    .filter(course => course.pre_generated_course_id)
                    .map(course => course.pre_generated_course_id)
            );

            const availablePreGenerated = preGeneratedCourses.filter(
                course => !userPreGeneratedIds.has(course.id)
            );

            // Get recommendations (popular courses in different subjects)
            const recommendations = await this.getRecommendationsForFreeUser(
                userId,
                subjectIds,
                commuteTime,
                difficulty
            );

            return {
                preGenerated: availablePreGenerated,
                userCourses,
                recommendations,
            };
        } catch (error) {
            console.error('Failed to get courses for free user:', error);
            throw new Error('Failed to load available courses');
        }
    }

    /**
     * Enroll a free user in a pre-generated course
     */
    async enrollFreeUserInCourse(
        userId: string,
        preGeneratedCourseId: string
    ): Promise<Course> {
        try {
            // Check if user is free tier
            const profile = await supabaseService.getUserProfile(userId);
            if (profile.error || !profile.data) {
                throw new Error('User profile not found');
            }

            if (profile.data.subscription_tier !== 'free') {
                throw new Error('This service is only for free tier users');
            }

            // Check if user already has this course
            const userCourses = await supabaseService.getUserCourses(userId);
            const existingCourse = userCourses.data?.find(
                course => course.pre_generated_course_id === preGeneratedCourseId
            );

            if (existingCourse) {
                return existingCourse;
            }

            // Assign the pre-generated course to the user
            const userCourse = await preGeneratedContentService.assignPreGeneratedCourseToUser(
                userId,
                preGeneratedCourseId
            );

            return userCourse;
        } catch (error) {
            console.error('Failed to enroll free user in course:', error);
            throw new Error('Failed to enroll in course');
        }
    }

    /**
     * Get course content for a free user (from pre-generated lessons)
     */
    async getFreeUserCourseContent(
        userId: string,
        courseId: string
    ): Promise<{
        course: Course;
        lessons: PreGeneratedLesson[];
    }> {
        try {
            // Get user's course
            const courseResponse = await supabaseService.getCourseById(courseId);
            if (courseResponse.error || !courseResponse.data) {
                throw new Error('Course not found');
            }

            const course = courseResponse.data;

            // Verify the course belongs to the user
            if (course.user_id !== userId) {
                throw new Error('Access denied');
            }

            // If it's a pre-generated course, get the pre-generated lessons
            if (course.pre_generated_course_id) {
                const lessonsResponse = await preGeneratedContentService.getPreGeneratedCourseLessons(
                    course.pre_generated_course_id
                );

                return {
                    course,
                    lessons: lessonsResponse,
                };
            }

            // If it's a regular course, get regular lessons (shouldn't happen for free users)
            const lessonsResponse = await supabaseService.getCourseLessons(courseId);

            return {
                course,
                lessons: lessonsResponse.data || [],
            };
        } catch (error) {
            console.error('Failed to get free user course content:', error);
            throw new Error('Failed to load course content');
        }
    }

    /**
     * Get recommendations for free users
     */
    private async getRecommendationsForFreeUser(
        userId: string,
        userSubjectIds: string[],
        commuteTime: number,
        difficulty: 'beginner' | 'intermediate' | 'advanced'
    ): Promise<PreGeneratedCourse[]> {
        try {
            // Get popular subjects that the user hasn't selected
            const allPopularSubjects = await supabaseService.getPopularSubjects(10);
            const otherSubjects = allPopularSubjects.filter(
                subject => !userSubjectIds.includes(subject.id)
            );

            const recommendations: PreGeneratedCourse[] = [];

            // Get 1-2 courses from other popular subjects
            for (const subject of otherSubjects.slice(0, 2)) {
                const coursesResponse = await preGeneratedContentService.getAvailablePreGeneratedCourses(
                    subject.id,
                    commuteTime,
                    difficulty
                );

                if (coursesResponse.length > 0) {
                    recommendations.push(coursesResponse[0]); // Take the first one
                }
            }

            return recommendations;
        } catch (error) {
            console.error('Failed to get recommendations:', error);
            return [];
        }
    }

    /**
     * Get learning progress for free user
     */
    async getFreeUserProgress(userId: string): Promise<{
        totalCourses: number;
        completedLessons: number;
        totalLessons: number;
        streakDays: number;
        weeklyMinutes: number;
    }> {
        try {
            const userCourses = await supabaseService.getUserCourses(userId);
            const courses = userCourses.data || [];

            const totalCourses = courses.length;
            let totalLessons = 0;
            let completedLessons = 0;

            // Calculate lesson progress
            for (const course of courses) {
                totalLessons += course.total_lessons;

                // Get user's lesson progress
                const progressResponse = await supabaseService.getUserLessonProgress(userId, course.id);
                if (progressResponse.data) {
                    completedLessons += progressResponse.data.filter(p => p.completed).length;
                }
            }

            // Get streak and weekly minutes (simplified for now)
            const streakDays = await this.calculateUserStreak(userId);
            const weeklyMinutes = await this.calculateWeeklyMinutes(userId);

            return {
                totalCourses,
                completedLessons,
                totalLessons,
                streakDays,
                weeklyMinutes,
            };
        } catch (error) {
            console.error('Failed to get free user progress:', error);
            return {
                totalCourses: 0,
                completedLessons: 0,
                totalLessons: 0,
                streakDays: 0,
                weeklyMinutes: 0,
            };
        }
    }

    /**
     * Calculate user's learning streak (simplified)
     */
    private async calculateUserStreak(userId: string): Promise<number> {
        // This would typically query lesson completion dates
        // For now, return a placeholder
        return 0;
    }

    /**
     * Calculate user's weekly learning minutes (simplified)
     */
    private async calculateWeeklyMinutes(userId: string): Promise<number> {
        // This would typically query lesson completion times
        // For now, return a placeholder
        return 0;
    }

    /**
     * Check if user can access premium features
     */
    async canAccessPremiumFeatures(userId: string): Promise<boolean> {
        try {
            const profile = await supabaseService.getUserProfile(userId);
            return profile.data?.subscription_tier === 'premium';
        } catch (error) {
            console.error('Failed to check premium access:', error);
            return false;
        }
    }

    /**
     * Get upgrade prompt for free users
     */
    getUpgradePrompt(): {
        title: string;
        message: string;
        features: string[];
        ctaText: string;
    } {
        return {
            title: 'Upgrade to Premium',
            message: 'Unlock personalized AI-generated courses tailored specifically for you!',
            features: [
                'Real-time AI course generation',
                'Personalized learning paths',
                'Advanced difficulty levels',
                'Priority support',
                'Unlimited course access',
                'Custom commute time optimization',
            ],
            ctaText: 'Upgrade Now',
        };
    }
}

// Export singleton instance
export const freeUserContentService = new FreeUserContentService();