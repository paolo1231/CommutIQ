import { ENV, OPENAI_CONFIG } from '../constants';
import {
    Course,
    CourseGenerationRequest,
    Lesson,
    LessonGenerationRequest,
    OpenAIResponse,
    Subject,
} from '../types';
import { supabaseService } from './supabaseService';

/**
 * ContentGenerationService handles AI-powered course and lesson generation
 * using OpenAI's GPT-4 API for content creation and TTS for audio generation
 */
export class ContentGenerationService {
    private apiKey: string;
    private baseUrl: string;

    constructor() {
        this.apiKey = ENV.OPENAI_API_KEY;
        this.baseUrl = OPENAI_CONFIG.API_URL;

        if (!this.apiKey) {
            throw new Error('OpenAI API key is required for content generation');
        }
    }

    /**
     * Generate a complete course with lessons based on user preferences
     */
    async generateCourse(request: CourseGenerationRequest): Promise<Course> {
        try {
            // Get subject information
            const subject = await supabaseService.getSubjectById(request.subject_id);
            if (!subject) {
                throw new Error('Subject not found');
            }

            // Generate course structure using OpenAI
            const courseStructure = await this.generateCourseStructure(
                subject,
                request.commute_time,
                request.difficulty || 'beginner'
            );

            // Create course in database
            const course = await supabaseService.createCourse({
                title: courseStructure.title,
                subject_id: request.subject_id,
                user_id: request.user_id,
                total_lessons: courseStructure.lessons.length,
                estimated_duration: courseStructure.estimatedDuration,
                difficulty: courseStructure.difficulty,
                is_premium: subject.is_premium,
            });

            // Generate and save lessons
            for (let i = 0; i < courseStructure.lessons.length; i++) {
                const lessonData = courseStructure.lessons[i];
                await this.generateAndSaveLesson(course.id, {
                    course_id: course.id,
                    lesson_order: i + 1,
                    duration: lessonData.duration,
                    topic: lessonData.topic,
                    previous_lessons: courseStructure.lessons.slice(0, i).map(l => l.topic),
                });
            }

            return course;
        } catch (error) {
            console.error('Course generation failed:', error);
            throw new Error('Failed to generate course. Please try again.');
        }
    }

    /**
     * Generate course structure using OpenAI GPT-4
     */
    private async generateCourseStructure(
        subject: Subject,
        commuteTime: number,
        difficulty: 'beginner' | 'intermediate' | 'advanced'
    ): Promise<{
        title: string;
        difficulty: 'beginner' | 'intermediate' | 'advanced';
        estimatedDuration: number;
        lessons: Array<{
            topic: string;
            duration: number;
            objectives: string[];
        }>;
    }> {
        const prompt = this.buildCourseStructurePrompt(subject, commuteTime, difficulty);

        const response = await this.callOpenAI(prompt, OPENAI_CONFIG.MAX_TOKENS.COURSE_GENERATION);

        try {
            const courseStructure = JSON.parse(response);
            return this.validateCourseStructure(courseStructure);
        } catch (error) {
            console.error('Failed to parse course structure:', error);
            throw new Error('Invalid course structure generated');
        }
    }

    /**
     * Generate and save a single lesson with content and audio
     */
    async generateAndSaveLesson(courseId: string, request: LessonGenerationRequest): Promise<Lesson> {
        try {
            // Generate lesson content
            const lessonContent = await this.generateLessonContent(request);

            // Generate audio from transcript
            const audioBuffer = await this.generateAudio(lessonContent.transcript);

            // Upload audio to storage
            const audioUrl = await this.uploadAudioToStorage(
                audioBuffer,
                `${courseId}/lesson_${request.lesson_order}.mp3`
            );

            // Save lesson to database
            const lesson = await supabaseService.createLesson({
                course_id: courseId,
                title: lessonContent.title,
                content: lessonContent.content,
                audio_url: audioUrl,
                duration: request.duration,
                transcript: lessonContent.transcript,
                lesson_order: request.lesson_order,
            });

            // Generate and save lesson interactions
            if (lessonContent.interactions && lessonContent.interactions.length > 0) {
                for (const interaction of lessonContent.interactions) {
                    await supabaseService.createLessonInteraction({
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
            console.error('Lesson generation failed:', error);
            throw new Error('Failed to generate lesson. Please try again.');
        }
    }

    /**
     * Generate lesson content using OpenAI GPT-4
     */
    private async generateLessonContent(request: LessonGenerationRequest): Promise<{
        title: string;
        content: string;
        transcript: string;
        interactions: Array<{
            type: 'quiz' | 'reflection' | 'practice';
            prompt: string;
            options?: string[];
            correct_answer?: string;
            order: number;
        }>;
    }> {
        const prompt = this.buildLessonContentPrompt(request);

        const response = await this.callOpenAI(prompt, OPENAI_CONFIG.MAX_TOKENS.LESSON_GENERATION);

        try {
            const lessonContent = JSON.parse(response);
            return this.validateLessonContent(lessonContent);
        } catch (error) {
            console.error('Failed to parse lesson content:', error);
            throw new Error('Invalid lesson content generated');
        }
    }

    /**
     * Generate audio using OpenAI TTS API
     */
    async generateAudio(text: string, voice: string = 'alloy'): Promise<Buffer> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/speech`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: OPENAI_CONFIG.MODELS.TTS,
                    input: text,
                    voice: voice,
                    response_format: 'mp3',
                    speed: 1.0,
                }),
            });

            if (!response.ok) {
                throw new Error(`TTS API error: ${response.status} ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        } catch (error) {
            console.error('Audio generation failed:', error);
            throw new Error('Failed to generate audio. Please try again.');
        }
    }

    /**
     * Upload audio buffer to Supabase Storage
     */
    private async uploadAudioToStorage(audioBuffer: Buffer, path: string): Promise<string> {
        try {
            const { data, error } = await supabaseService.supabase.storage
                .from('lesson-audio')
                .upload(path, audioBuffer, {
                    contentType: 'audio/mpeg',
                    upsert: true,
                });

            if (error) {
                throw error;
            }

            const { data: { publicUrl } } = supabaseService.supabase.storage
                .from('lesson-audio')
                .getPublicUrl(path);

            return publicUrl;
        } catch (error) {
            console.error('Audio upload failed:', error);
            throw new Error('Failed to upload audio file');
        }
    }

    /**
     * Make API call to OpenAI GPT-4
     */
    private async callOpenAI(prompt: string, maxTokens: number): Promise<string> {
        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: OPENAI_CONFIG.MODELS.CHAT,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert educational content creator specializing in micro-learning for commuters. Create engaging, structured content optimized for audio consumption.',
                        },
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                    max_tokens: maxTokens,
                    temperature: OPENAI_CONFIG.TEMPERATURE,
                }),
                timeout: OPENAI_CONFIG.REQUEST_TIMEOUT,
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
            }

            const data: OpenAIResponse = await response.json();

            if (!data.choices || data.choices.length === 0) {
                throw new Error('No response from OpenAI API');
            }

            return data.choices[0].message.content;
        } catch (error) {
            console.error('OpenAI API call failed:', error);
            throw new Error('Failed to generate content. Please try again.');
        }
    }
    /*
  *
     * Build prompt for course structure generation
     */
    private buildCourseStructurePrompt(
        subject: Subject,
        commuteTime: number,
        difficulty: 'beginner' | 'intermediate' | 'advanced'
    ): string {
        return `Create a structured learning course for ${subject.name} optimized for ${commuteTime}-minute commute sessions.

Requirements:
- Target audience: ${difficulty} level learners
- Each lesson should fit within ${commuteTime} minutes
- Course should have 8-12 lessons total
- Content must be engaging for audio-only consumption
- Include clear learning progression
- Focus on practical, applicable knowledge

Subject context: ${subject.category} - ${subject.name}

Return a JSON object with this exact structure:
{
  "title": "Course title (max 80 characters)",
  "difficulty": "${difficulty}",
  "estimatedDuration": total_minutes_number,
  "lessons": [
    {
      "topic": "Lesson topic",
      "duration": ${commuteTime},
      "objectives": ["objective1", "objective2", "objective3"]
    }
  ]
}

Make the course practical and immediately applicable. Focus on building skills progressively.`;
    }

    /**
     * Build prompt for lesson content generation
     */
    private buildLessonContentPrompt(request: LessonGenerationRequest): string {
        const previousContext = request.previous_lessons && request.previous_lessons.length > 0
            ? `Previous lessons covered: ${request.previous_lessons.join(', ')}`
            : 'This is the first lesson in the course';

        return `Create engaging lesson content for a ${request.duration}-minute audio lesson.

Lesson Details:
- Topic: ${request.topic}
- Duration: ${request.duration} minutes
- Lesson number: ${request.lesson_order}
- ${previousContext}

Requirements:
- Content must be optimized for audio consumption (no visual elements)
- Include engaging storytelling and examples
- Add natural pauses and transitions
- Create 2-3 interactive elements (quiz, reflection, or practice)
- Use conversational, friendly tone
- Include practical applications
- End with clear takeaways

Return a JSON object with this exact structure:
{
  "title": "Lesson title (max 60 characters)",
  "content": "Structured lesson content with clear sections",
  "transcript": "Natural, conversational script for audio narration (${request.duration * 150} words approximately)",
  "interactions": [
    {
      "type": "quiz|reflection|practice",
      "prompt": "Interactive prompt text",
      "options": ["option1", "option2", "option3", "option4"] (only for quiz type),
      "correct_answer": "correct option" (only for quiz type),
      "order": 1
    }
  ]
}

Make the transcript sound natural when spoken aloud, with appropriate pacing for a ${request.duration}-minute lesson.`;
    }

    /**
     * Validate course structure response from OpenAI
     */
    private validateCourseStructure(structure: any): {
        title: string;
        difficulty: 'beginner' | 'intermediate' | 'advanced';
        estimatedDuration: number;
        lessons: Array<{
            topic: string;
            duration: number;
            objectives: string[];
        }>;
    } {
        if (!structure || typeof structure !== 'object') {
            throw new Error('Invalid course structure format');
        }

        const { title, difficulty, estimatedDuration, lessons } = structure;

        if (!title || typeof title !== 'string' || title.length > 100) {
            throw new Error('Invalid course title');
        }

        if (!['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
            throw new Error('Invalid difficulty level');
        }

        if (!estimatedDuration || typeof estimatedDuration !== 'number' || estimatedDuration <= 0) {
            throw new Error('Invalid estimated duration');
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
     * Validate lesson content response from OpenAI
     */
    private validateLessonContent(content: any): {
        title: string;
        content: string;
        transcript: string;
        interactions: Array<{
            type: 'quiz' | 'reflection' | 'practice';
            prompt: string;
            options?: string[];
            correct_answer?: string;
            order: number;
        }>;
    } {
        if (!content || typeof content !== 'object') {
            throw new Error('Invalid lesson content format');
        }

        const { title, content: lessonContent, transcript, interactions } = content;

        if (!title || typeof title !== 'string' || title.length > 80) {
            throw new Error('Invalid lesson title');
        }

        if (!lessonContent || typeof lessonContent !== 'string') {
            throw new Error('Invalid lesson content');
        }

        if (!transcript || typeof transcript !== 'string' || transcript.length < 100) {
            throw new Error('Invalid lesson transcript');
        }

        if (!Array.isArray(interactions)) {
            throw new Error('Invalid interactions format');
        }

        // Validate each interaction
        interactions.forEach((interaction, index) => {
            if (!['quiz', 'reflection', 'practice'].includes(interaction.type)) {
                throw new Error(`Invalid interaction type for interaction ${index + 1}`);
            }
            if (!interaction.prompt || typeof interaction.prompt !== 'string') {
                throw new Error(`Invalid prompt for interaction ${index + 1}`);
            }
            if (interaction.type === 'quiz') {
                if (!Array.isArray(interaction.options) || interaction.options.length < 2) {
                    throw new Error(`Quiz interaction ${index + 1} must have at least 2 options`);
                }
                if (!interaction.correct_answer || typeof interaction.correct_answer !== 'string') {
                    throw new Error(`Quiz interaction ${index + 1} must have a correct answer`);
                }
            }
            if (typeof interaction.order !== 'number') {
                throw new Error(`Invalid order for interaction ${index + 1}`);
            }
        });

        return content;
    }

    /**
     * Generate fallback content when OpenAI fails
     */
    async generateFallbackCourse(subject: Subject, commuteTime: number, userId: string): Promise<Course> {
        console.log('Generating fallback course for:', subject.name);

        // Create a basic course structure
        const course = await supabaseService.createCourse({
            title: `Introduction to ${subject.name}`,
            subject_id: subject.id,
            user_id: userId,
            total_lessons: 5,
            estimated_duration: commuteTime * 5,
            difficulty: 'beginner',
            is_premium: subject.is_premium,
        });

        // Create basic lessons
        const basicLessons = this.getFallbackLessons(subject.name, commuteTime);

        for (let i = 0; i < basicLessons.length; i++) {
            const lessonData = basicLessons[i];
            await supabaseService.createLesson({
                course_id: course.id,
                title: lessonData.title,
                content: lessonData.content,
                audio_url: '', // No audio for fallback
                duration: commuteTime,
                transcript: lessonData.transcript,
                lesson_order: i + 1,
            });
        }

        return course;
    }

    /**
     * Get fallback lesson content for when AI generation fails
     */
    private getFallbackLessons(subjectName: string, duration: number) {
        return [
            {
                title: `Welcome to ${subjectName}`,
                content: `Introduction to ${subjectName} and what you'll learn in this course.`,
                transcript: `Welcome to your ${subjectName} learning journey! In this course, we'll explore the fundamentals and help you build a strong foundation. Let's get started!`,
            },
            {
                title: `${subjectName} Basics`,
                content: `Core concepts and terminology in ${subjectName}.`,
                transcript: `Now that we've introduced ${subjectName}, let's dive into the basic concepts you need to know. These fundamentals will serve as building blocks for everything else we'll cover.`,
            },
            {
                title: `Practical ${subjectName}`,
                content: `Real-world applications and examples in ${subjectName}.`,
                transcript: `Theory is important, but let's see how ${subjectName} applies to real situations. We'll explore practical examples that you can use immediately.`,
            },
            {
                title: `Advanced ${subjectName} Concepts`,
                content: `More complex topics and advanced techniques in ${subjectName}.`,
                transcript: `You've mastered the basics, so now let's explore some more advanced concepts in ${subjectName}. These techniques will help you take your skills to the next level.`,
            },
            {
                title: `${subjectName} Mastery`,
                content: `Putting it all together and next steps in your ${subjectName} journey.`,
                transcript: `Congratulations! You've completed your introduction to ${subjectName}. Let's review what you've learned and discuss how to continue your learning journey.`,
            },
        ];
    }

    /**
     * Regenerate lesson audio if needed
     */
    async regenerateLessonAudio(lessonId: string, voice?: string): Promise<string> {
        try {
            const lesson = await supabaseService.getLessonById(lessonId);
            if (!lesson) {
                throw new Error('Lesson not found');
            }

            // Generate new audio
            const audioBuffer = await this.generateAudio(lesson.transcript, voice);

            // Upload to storage
            const audioUrl = await this.uploadAudioToStorage(
                audioBuffer,
                `${lesson.course_id}/lesson_${lesson.lesson_order}_v2.mp3`
            );

            // Update lesson with new audio URL
            await supabaseService.updateLesson(lessonId, { audio_url: audioUrl });

            return audioUrl;
        } catch (error) {
            console.error('Audio regeneration failed:', error);
            throw new Error('Failed to regenerate audio');
        }
    }
}

// Export singleton instance
export const contentGenerationService = new ContentGenerationService();