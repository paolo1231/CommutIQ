import { OPENAI_CONFIG } from '../constants';
import {
    Course,
    PreGeneratedCourse,
    PreGeneratedLesson,
    Subject
} from '../types';
import { contentGenerationService } from './contentGenerationService';
import { supabaseService } from './supabaseService';

/**
 * PreGeneratedContentService handles creation and management of pre-generated courses
 * for free users. These courses are created without user associations and can be
 * shared among all free users.
 */
export class PreGeneratedContentService {
    /**
     * Generate a pre-built course for a specific subject and commute time
     */
    async generatePreBuiltCourse(
        subjectId: string,
        commuteTime: number,
        difficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
    ): Promise<PreGeneratedCourse> {
        try {
            // Get subject information
            const subject = await supabaseService.getSubjectById(subjectId);
            if (!subject) {
                throw new Error('Subject not found');
            }

            // Generate course structure using the existing content generation service
            const courseStructure = await this.generateCourseStructure(
                subject,
                commuteTime,
                difficulty
            );

            // Create pre-generated course in database (no user_id)
            const courseResponse = await supabaseService.createPreGeneratedCourse({
                title: courseStructure.title,
                subject_id: subjectId,
                total_lessons: courseStructure.lessons.length,
                estimated_duration: courseStructure.estimatedDuration,
                difficulty: courseStructure.difficulty,
                commute_time: commuteTime,
                is_premium: subject.is_premium,
                description: courseStructure.description,
                tags: courseStructure.tags,
            });

            if (courseResponse.error || !courseResponse.data) {
                throw new Error(courseResponse.error || 'Failed to create pre-generated course');
            }

            const course = courseResponse.data;

            // Generate and save lessons
            for (let i = 0; i < courseStructure.lessons.length; i++) {
                const lessonData = courseStructure.lessons[i];
                await this.generateAndSavePreBuiltLesson(course.id, {
                    course_id: course.id,
                    lesson_order: i + 1,
                    duration: lessonData.duration,
                    topic: lessonData.topic,
                    previous_lessons: courseStructure.lessons.slice(0, i).map(l => l.topic),
                });
            }

            return course;
        } catch (error) {
            console.error('Pre-built course generation failed:', error);
            throw new Error('Failed to generate pre-built course. Please try again.');
        }
    }

    /**
     * Generate and save a pre-built lesson (no user association)
     */
    private async generateAndSavePreBuiltLesson(
        courseId: string,
        request: {
            course_id: string;
            lesson_order: number;
            duration: number;
            topic: string;
            previous_lessons: string[];
        }
    ): Promise<PreGeneratedLesson> {
        try {
            // Generate lesson content using existing service
            const lessonContent = await contentGenerationService.generateLessonContent({
                course_id: request.course_id,
                lesson_order: request.lesson_order,
                duration: request.duration,
                topic: request.topic,
                previous_lessons: request.previous_lessons,
            });

            // Save pre-generated lesson to database (no user association)
            const lessonResponse = await supabaseService.createPreGeneratedLesson({
                course_id: courseId,
                title: lessonContent.title,
                content: lessonContent.content,
                duration: request.duration,
                transcript: lessonContent.transcript,
                lesson_order: request.lesson_order,
                topic: request.topic,
                objectives: lessonContent.objectives || [],
                key_concepts: lessonContent.key_concepts || [],
            });

            if (lessonResponse.error || !lessonResponse.data) {
                throw new Error(lessonResponse.error || 'Failed to create pre-generated lesson');
            }

            const lesson = lessonResponse.data;

            // Generate and save lesson interactions
            if (lessonContent.interactions && lessonContent.interactions.length > 0) {
                for (const interaction of lessonContent.interactions) {
                    await supabaseService.createPreGeneratedLessonInteraction({
                        lesson_id: lesson.id,
                        type: interaction.type,
                        prompt: interaction.prompt,
                        options: interaction.options,
                        correct_answer: interaction.correct_answer,
                        interaction_order: interaction.order,
                    });
                }
            }

            return lesson;
        } catch (error) {
            console.error('Pre-built lesson generation failed:', error);
            throw new Error('Failed to generate pre-built lesson. Please try again.');
        }
    }

    /**
     * Get available pre-generated courses for a subject and commute time
     */
    async getAvailablePreGeneratedCourses(
        subjectId: string,
        commuteTime: number,
        difficulty?: 'beginner' | 'intermediate' | 'advanced'
    ): Promise<PreGeneratedCourse[]> {
        try {
            const coursesResponse = await supabaseService.getPreGeneratedCourses({
                subject_id: subjectId,
                commute_time: commuteTime,
                difficulty: difficulty,
            });

            if (coursesResponse.error) {
                throw new Error(coursesResponse.error);
            }

            return coursesResponse.data || [];
        } catch (error) {
            console.error('Failed to get pre-generated courses:', error);
            throw new Error('Failed to load available courses');
        }
    }

    /**
     * Get lessons for a pre-generated course
     */
    async getPreGeneratedCourseLessons(courseId: string): Promise<PreGeneratedLesson[]> {
        try {
            const lessonsResponse = await supabaseService.getPreGeneratedCourseLessons(courseId);

            if (lessonsResponse.error) {
                throw new Error(lessonsResponse.error);
            }

            return lessonsResponse.data || [];
        } catch (error) {
            console.error('Failed to get pre-generated lessons:', error);
            throw new Error('Failed to load course lessons');
        }
    }

    /**
     * Assign a pre-generated course to a user (for free users)
     */
    async assignPreGeneratedCourseToUser(
        userId: string,
        preGeneratedCourseId: string
    ): Promise<Course> {
        try {
            // Get the pre-generated course
            const preGeneratedCourse = await supabaseService.getPreGeneratedCourseById(preGeneratedCourseId);
            if (!preGeneratedCourse) {
                throw new Error('Pre-generated course not found');
            }

            // Create a user-specific course based on the pre-generated one
            const userCourseResponse = await supabaseService.createCourse({
                title: preGeneratedCourse.title,
                subject_id: preGeneratedCourse.subject_id,
                user_id: userId,
                total_lessons: preGeneratedCourse.total_lessons,
                estimated_duration: preGeneratedCourse.estimated_duration,
                difficulty: preGeneratedCourse.difficulty,
                is_premium: false, // Free users get free courses
                pre_generated_course_id: preGeneratedCourseId, // Link to original
            });

            if (userCourseResponse.error || !userCourseResponse.data) {
                throw new Error(userCourseResponse.error || 'Failed to assign course to user');
            }

            return userCourseResponse.data;
        } catch (error) {
            console.error('Failed to assign pre-generated course to user:', error);
            throw new Error('Failed to assign course to user');
        }
    }

    /**
     * Generate course structure (reusing logic from contentGenerationService)
     */
    private async generateCourseStructure(
        subject: Subject,
        commuteTime: number,
        difficulty: 'beginner' | 'intermediate' | 'advanced'
    ): Promise<{
        title: string;
        difficulty: 'beginner' | 'intermediate' | 'advanced';
        estimatedDuration: number;
        description: string;
        tags: string[];
        lessons: Array<{
            topic: string;
            duration: number;
            objectives: string[];
        }>;
    }> {
        const prompt = this.buildCourseStructurePrompt(subject, commuteTime, difficulty);

        const response = await contentGenerationService.callOpenAI(prompt, OPENAI_CONFIG.MAX_TOKENS.COURSE_GENERATION);

        try {
            const cleanedResponse = contentGenerationService.extractJsonFromMarkdown(response);
            const courseStructure = JSON.parse(cleanedResponse);
            return this.validateCourseStructure(courseStructure);
        } catch (error) {
            console.error('Failed to parse course structure:', error);
            console.error('Raw response:', response);
            throw new Error('Invalid course structure generated');
        }
    }

    /**
     * Build prompt for pre-generated course structure
     */
    private buildCourseStructurePrompt(
        subject: Subject,
        commuteTime: number,
        difficulty: 'beginner' | 'intermediate' | 'advanced'
    ): string {
        return `Create a structured learning course for ${subject.name} optimized for ${commuteTime}-minute commute sessions.

This course will be used by multiple learners, so make it broadly applicable and engaging.

Requirements:
- Target audience: ${difficulty} level learners
- Each lesson should fit within ${commuteTime} minutes
- Course should have 8-12 lessons total
- Content must be engaging for audio-only consumption
- Include clear learning progression
- Focus on practical, applicable knowledge
- Make it suitable for a general audience

Subject context: ${subject.category} - ${subject.name}

Return a JSON object with this exact structure:
{
  "title": "Course title (max 80 characters)",
  "difficulty": "${difficulty}",
  "estimatedDuration": total_minutes_number,
  "description": "Brief course description (max 200 characters)",
  "tags": ["tag1", "tag2", "tag3"],
  "lessons": [
    {
      "topic": "Lesson topic",
      "duration": ${commuteTime},
      "objectives": ["objective1", "objective2", "objective3"]
    }
  ]
}

Make the course practical, immediately applicable, and suitable for commuter learning.`;
    }

    /**
     * Validate course structure for pre-generated content
     */
    private validateCourseStructure(structure: any): {
        title: string;
        difficulty: 'beginner' | 'intermediate' | 'advanced';
        estimatedDuration: number;
        description: string;
        tags: string[];
        lessons: Array<{
            topic: string;
            duration: number;
            objectives: string[];
        }>;
    } {
        if (!structure || typeof structure !== 'object') {
            throw new Error('Invalid course structure format');
        }

        const { title, difficulty, estimatedDuration, description, tags, lessons } = structure;

        if (!title || typeof title !== 'string' || title.length > 100) {
            throw new Error('Invalid course title');
        }

        if (!['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
            throw new Error('Invalid difficulty level');
        }

        if (!estimatedDuration || typeof estimatedDuration !== 'number' || estimatedDuration <= 0) {
            throw new Error('Invalid estimated duration');
        }

        if (!description || typeof description !== 'string' || description.length > 250) {
            throw new Error('Invalid course description');
        }

        if (!Array.isArray(tags) || tags.length === 0) {
            throw new Error('Invalid course tags');
        }

        if (!Array.isArray(lessons) || lessons.length < 3 || lessons.length > 15) {
            throw new Error('Invalid number of lessons (must be 3-15)');
        }

        // Validate each lesson
        lessons.forEach((lesson, index) => {
            if (!lesson.topic || typeof lesson.topic !== 'string') {
                throw new Error(`Invalid topic for lesson ${index + 1}`);
            }
            if (!lesson.duration || typeof lesson.duration !== 'number' || lesson.duration <= 0) {
                throw new Error(`Invalid duration for lesson ${index + 1}`);
            }
            if (!Array.isArray(lesson.objectives) || lesson.objectives.length === 0) {
                throw new Error(`Invalid objectives for lesson ${index + 1}`);
            }
        });

        return structure;
    }

    /**
     * Batch generate courses for popular subjects and commute times
     */
    async batchGeneratePopularCourses(): Promise<{
        generated: number;
        errors: string[];
    }> {
        const results = {
            generated: 0,
            errors: [] as string[],
        };

        try {
            // Get popular subjects
            const popularSubjects = await supabaseService.getPopularSubjects(10);
            const commonCommuteTimes = [15, 20, 30, 45]; // minutes
            const difficulties = ['beginner', 'intermediate'] as const;

            for (const subject of popularSubjects) {
                for (const commuteTime of commonCommuteTimes) {
                    for (const difficulty of difficulties) {
                        try {
                            // Check if course already exists
                            const existing = await this.getAvailablePreGeneratedCourses(
                                subject.id,
                                commuteTime,
                                difficulty
                            );

                            if (existing.length === 0) {
                                await this.generatePreBuiltCourse(subject.id, commuteTime, difficulty);
                                results.generated++;
                                console.log(`Generated course: ${subject.name} (${difficulty}, ${commuteTime}min)`);
                            }
                        } catch (error) {
                            const errorMsg = `Failed to generate course for ${subject.name} (${difficulty}, ${commuteTime}min): ${error.message}`;
                            results.errors.push(errorMsg);
                            console.error(errorMsg);
                        }
                    }
                }
            }
        } catch (error) {
            results.errors.push(`Batch generation failed: ${error.message}`);
        }

        return results;
    }
}

// Export singleton instance
export const preGeneratedContentService = new PreGeneratedContentService();