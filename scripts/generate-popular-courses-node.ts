#!/usr/bin/env node

/**
 * Node.js compatible script to batch generate popular pre-built courses for free users
 * Run with: npx tsx scripts/generate-popular-courses-node.ts
 */

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

// Environment configuration for Node.js
const ENV = {
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
};

// OpenAI Configuration
const OPENAI_CONFIG = {
    API_URL: 'https://api.openai.com/v1',
    MODELS: {
        CHAT: 'gpt-4o-mini',
        TTS: 'tts-1',
    },
    MAX_TOKENS: {
        COURSE_GENERATION: 4000,
        LESSON_GENERATION: 3000,
    },
    TEMPERATURE: 1,
};

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
    ENV.SUPABASE_URL,
    ENV.SUPABASE_SERVICE_ROLE_KEY || ENV.SUPABASE_ANON_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

interface Subject {
    id: string;
    name: string;
    category: string;
    is_premium: boolean;
}

interface PreGeneratedCourse {
    id: string;
    title: string;
    subject_id: string;
    total_lessons: number;
    estimated_duration: number;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    commute_time: number;
    is_premium: boolean;
    description: string;
    tags: string[];
}

class NodeContentGenerator {
    private apiKey: string;
    private baseUrl: string;

    constructor() {
        this.apiKey = ENV.OPENAI_API_KEY;
        this.baseUrl = OPENAI_CONFIG.API_URL;

        if (!this.apiKey) {
            throw new Error('OpenAI API key is required for content generation');
        }
    }

    async generatePreBuiltCourse(
        subject: Subject,
        commuteTime: number,
        difficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
    ): Promise<PreGeneratedCourse> {
        try {
            console.log(`Generating course: ${subject.name} (${difficulty}, ${commuteTime}min)`);

            // Generate course structure
            const courseStructure = await this.generateCourseStructure(subject, commuteTime, difficulty);

            // Create pre-generated course in database
            const { data: course, error } = await supabase
                .from('pre_generated_courses')
                .insert([{
                    title: courseStructure.title,
                    subject_id: subject.id,
                    total_lessons: courseStructure.lessons.length,
                    estimated_duration: courseStructure.estimatedDuration,
                    difficulty: courseStructure.difficulty,
                    commute_time: commuteTime,
                    is_premium: subject.is_premium,
                    description: courseStructure.description,
                    tags: courseStructure.tags,
                }])
                .select()
                .single();

            if (error || !course) {
                throw new Error(error?.message || 'Failed to create pre-generated course');
            }

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

            console.log(`✅ Generated course: ${courseStructure.title}`);
            return course;
        } catch (error) {
            console.error('Pre-built course generation failed:', error);
            throw error;
        }
    }

    private async generateAndSavePreBuiltLesson(
        courseId: string,
        request: {
            course_id: string;
            lesson_order: number;
            duration: number;
            topic: string;
            previous_lessons: string[];
        }
    ) {
        try {
            // Generate lesson content
            const lessonContent = await this.generateLessonContent(request);

            // Save pre-generated lesson to database
            const { data: lesson, error } = await supabase
                .from('pre_generated_lessons')
                .insert([{
                    course_id: courseId,
                    title: lessonContent.title,
                    content: lessonContent.content,
                    duration: request.duration,
                    transcript: lessonContent.transcript,
                    lesson_order: request.lesson_order,
                    topic: request.topic,
                    objectives: lessonContent.objectives || [],
                    key_concepts: lessonContent.key_concepts || [],
                }])
                .select()
                .single();

            if (error || !lesson) {
                throw new Error(error?.message || 'Failed to create pre-generated lesson');
            }

            // Generate and save lesson interactions
            if (lessonContent.interactions && lessonContent.interactions.length > 0) {
                for (const interaction of lessonContent.interactions) {
                    await supabase
                        .from('pre_generated_lesson_interactions')
                        .insert([{
                            lesson_id: lesson.id,
                            type: interaction.type,
                            prompt: interaction.prompt,
                            options: interaction.options,
                            correct_answer: interaction.correct_answer,
                            interaction_order: interaction.order,
                        }]);
                }
            }

            console.log(`  ✅ Generated lesson: ${lessonContent.title}`);
        } catch (error) {
            console.error('Pre-built lesson generation failed:', error);
            throw error;
        }
    }

    private async generateCourseStructure(
        subject: Subject,
        commuteTime: number,
        difficulty: 'beginner' | 'intermediate' | 'advanced'
    ) {
        const prompt = this.buildCourseStructurePrompt(subject, commuteTime, difficulty);
        const response = await this.callOpenAI(prompt, OPENAI_CONFIG.MAX_TOKENS.COURSE_GENERATION);

        try {
            const cleanedResponse = this.extractJsonFromMarkdown(response);
            const courseStructure = JSON.parse(cleanedResponse);
            return this.validateCourseStructure(courseStructure);
        } catch (error) {
            console.error('Failed to parse course structure:', error);
            console.error('Raw response:', response);
            throw new Error('Invalid course structure generated');
        }
    }

    private async generateLessonContent(request: {
        course_id: string;
        lesson_order: number;
        duration: number;
        topic: string;
        previous_lessons: string[];
    }) {
        const prompt = this.buildLessonContentPrompt(request);
        const response = await this.callOpenAI(prompt, OPENAI_CONFIG.MAX_TOKENS.LESSON_GENERATION);

        try {
            const cleanedResponse = this.extractJsonFromMarkdown(response);
            const lessonContent = JSON.parse(cleanedResponse);
            return this.validateLessonContent(lessonContent);
        } catch (error) {
            console.error('Failed to parse lesson content:', error);
            console.error('Raw response:', response);
            throw new Error('Invalid lesson content generated');
        }
    }

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
                    max_completion_tokens: maxTokens,
                    temperature: OPENAI_CONFIG.TEMPERATURE,
                }),
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.choices || data.choices.length === 0) {
                throw new Error('No response from OpenAI API');
            }

            const content = data.choices[0].message.content;

            if (!content || content.trim() === '') {
                throw new Error('OpenAI API returned empty content');
            }

            return content;
        } catch (error) {
            console.error('OpenAI API call failed:', error);
            throw new Error('Failed to generate content. Please try again.');
        }
    }

    private extractJsonFromMarkdown(response: string): string {
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            return jsonMatch[1].trim();
        }
        return response.trim();
    }

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

    private buildLessonContentPrompt(request: {
        lesson_order: number;
        duration: number;
        topic: string;
        previous_lessons: string[];
    }): string {
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
  "objectives": ["objective1", "objective2"],
  "key_concepts": ["concept1", "concept2"],
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

    private validateCourseStructure(structure: any) {
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

        return structure;
    }

    private validateLessonContent(content: any) {
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

        return content;
    }
}

async function main() {
    console.log('🚀 Starting batch generation of popular courses...\n');

    try {
        // Validate environment variables
        if (!ENV.SUPABASE_URL || !ENV.OPENAI_API_KEY) {
            throw new Error('Missing required environment variables. Check your .env file.');
        }

        if (!ENV.SUPABASE_SERVICE_ROLE_KEY && !ENV.SUPABASE_ANON_KEY) {
            throw new Error('Either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is required.');
        }

        if (ENV.SUPABASE_SERVICE_ROLE_KEY) {
            console.log('✅ Using service role key for admin operations');
        } else {
            console.log('⚠️  Using anon key - may encounter RLS restrictions');
        }

        console.log('✅ Environment variables loaded');
        console.log('✅ Database connection established');

        // Get popular subjects
        const { data: subjects, error } = await supabase
            .from('subjects')
            .select('*')
            .eq('is_premium', false)
            .order('created_at', { ascending: true })
            .limit(5);

        if (error) {
            throw new Error(`Failed to get subjects: ${error.message}`);
        }

        if (!subjects || subjects.length === 0) {
            throw new Error('No subjects found. Please add some subjects to the database first.');
        }

        console.log(`📚 Found ${subjects.length} subjects to generate courses for:`);
        subjects.forEach(subject => {
            console.log(`   - ${subject.name} (${subject.category})`);
        });
        console.log('');

        const generator = new NodeContentGenerator();
        const commonCommuteTimes = [15, 20, 30, 45];
        const difficulties = ['beginner', 'intermediate'] as const;

        let generated = 0;
        const errors: string[] = [];

        for (const subject of subjects) {
            for (const commuteTime of commonCommuteTimes) {
                for (const difficulty of difficulties) {
                    try {
                        // Check if course already exists
                        const { data: existing } = await supabase
                            .from('pre_generated_courses')
                            .select('id')
                            .eq('subject_id', subject.id)
                            .eq('commute_time', commuteTime)
                            .eq('difficulty', difficulty);

                        if (existing && existing.length === 0) {
                            await generator.generatePreBuiltCourse(subject, commuteTime, difficulty);
                            generated++;
                        } else {
                            console.log(`⏭️  Course already exists: ${subject.name} (${difficulty}, ${commuteTime}min)`);
                        }
                    } catch (error) {
                        const errorMsg = `Failed to generate course for ${subject.name} (${difficulty}, ${commuteTime}min): ${error.message}`;
                        errors.push(errorMsg);
                        console.error(`❌ ${errorMsg}`);
                    }
                }
            }
        }

        console.log('\n📊 Generation Results:');
        console.log(`✅ Successfully generated: ${generated} courses`);

        if (errors.length > 0) {
            console.log(`❌ Errors encountered: ${errors.length}`);
            errors.forEach(error => {
                console.log(`   - ${error}`);
            });
        }

        // Get final statistics
        const { data: allCourses } = await supabase
            .from('pre_generated_courses')
            .select('*');

        console.log('\n📈 Final Statistics:');
        console.log(`   Total pre-generated courses: ${allCourses?.length || 0}`);

        console.log('\n🎉 Batch generation completed!');

    } catch (error) {
        console.error('❌ Batch generation failed:', error);
        process.exit(1);
    }
}

// Handle script execution
if (require.main === module) {
    main().catch(console.error);
}

export { main as generatePopularCourses };

