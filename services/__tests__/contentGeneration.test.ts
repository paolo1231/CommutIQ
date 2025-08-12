/**
 * Tests for ContentGenerationService
 * These tests verify the content generation functionality
 */

import { contentGenerationService } from '../contentGenerationService';
import { supabaseService } from '../supabaseService';

// Mock the environment variables for testing
jest.mock('../../constants', () => ({
    ...jest.requireActual('../../constants'),
    ENV: {
        ...jest.requireActual('../../constants').ENV,
        OPENAI_API_KEY: 'test-api-key',
    },
}));

// Mock fetch for OpenAI API calls
global.fetch = jest.fn();

// Mock Supabase service
jest.mock('../supabaseService');

describe('ContentGenerationService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Course Generation', () => {
        it('should generate a course successfully', async () => {
            // Mock Supabase responses
            const mockSubject = {
                id: 'test-subject-id',
                name: 'Test Subject',
                category: 'Test Category',
                is_premium: false,
            };

            const mockCourse = {
                id: 'test-course-id',
                title: 'Test Course',
                subject_id: 'test-subject-id',
                user_id: 'test-user-id',
                total_lessons: 5,
                estimated_duration: 150,
                difficulty: 'beginner',
                is_premium: false,
            };

            (supabaseService.getSubjectById as jest.Mock).mockResolvedValue(mockSubject);
            (supabaseService.createCourse as jest.Mock).mockResolvedValue({ data: mockCourse });
            (supabaseService.createLesson as jest.Mock).mockResolvedValue({ data: { id: 'lesson-id' } });
            (supabaseService.createLessonInteraction as jest.Mock).mockResolvedValue({ data: { id: 'interaction-id' } });

            // Mock OpenAI API responses
            const mockCourseStructure = {
                title: 'Introduction to Test Subject',
                difficulty: 'beginner',
                estimatedDuration: 150,
                lessons: [
                    {
                        topic: 'Lesson 1',
                        duration: 30,
                        objectives: ['Learn basics', 'Understand concepts'],
                    },
                ],
            };

            const mockLessonContent = {
                title: 'Lesson 1',
                content: 'Test lesson content',
                transcript: 'This is a test lesson transcript for audio generation.',
                interactions: [
                    {
                        type: 'quiz',
                        prompt: 'What is the main topic?',
                        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
                        correct_answer: 'Option 1',
                        order: 1,
                    },
                ],
            };

            (fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({
                        choices: [{ message: { content: JSON.stringify(mockCourseStructure) } }],
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({
                        choices: [{ message: { content: JSON.stringify(mockLessonContent) } }],
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
                });

            // Mock Supabase storage
            const mockSupabaseStorage = {
                from: jest.fn().mockReturnValue({
                    upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
                    getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://test-url.com/audio.mp3' } }),
                }),
            };

            (supabaseService as any).supabase = { storage: mockSupabaseStorage };

            // Test course generation
            const result = await contentGenerationService.generateCourse({
                subject_id: 'test-subject-id',
                user_id: 'test-user-id',
                commute_time: 30,
                difficulty: 'beginner',
            });

            expect(result).toEqual(mockCourse);
            expect(supabaseService.getSubjectById).toHaveBeenCalledWith('test-subject-id');
            expect(supabaseService.createCourse).toHaveBeenCalled();
            expect(supabaseService.createLesson).toHaveBeenCalled();
        });

        it('should handle OpenAI API errors gracefully', async () => {
            const mockSubject = {
                id: 'test-subject-id',
                name: 'Test Subject',
                category: 'Test Category',
                is_premium: false,
            };

            (supabaseService.getSubjectById as jest.Mock).mockResolvedValue(mockSubject);

            // Mock OpenAI API error
            (fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
            });

            await expect(
                contentGenerationService.generateCourse({
                    subject_id: 'test-subject-id',
                    user_id: 'test-user-id',
                    commute_time: 30,
                })
            ).rejects.toThrow('Failed to generate course');
        });

        it('should generate fallback course when AI fails', async () => {
            const mockSubject = {
                id: 'test-subject-id',
                name: 'Test Subject',
                category: 'Test Category',
                is_premium: false,
            };

            const mockFallbackCourse = {
                id: 'fallback-course-id',
                title: 'Introduction to Test Subject',
                subject_id: 'test-subject-id',
                user_id: 'test-user-id',
                total_lessons: 5,
                estimated_duration: 150,
                difficulty: 'beginner',
                is_premium: false,
            };

            (supabaseService.createCourse as jest.Mock).mockResolvedValue({ data: mockFallbackCourse });
            (supabaseService.createLesson as jest.Mock).mockResolvedValue({ data: { id: 'lesson-id' } });

            const result = await contentGenerationService.generateFallbackCourse(
                mockSubject as any,
                30,
                'test-user-id'
            );

            expect(result).toEqual(mockFallbackCourse);
            expect(supabaseService.createCourse).toHaveBeenCalledWith({
                title: 'Introduction to Test Subject',
                subject_id: 'test-subject-id',
                user_id: 'test-user-id',
                total_lessons: 5,
                estimated_duration: 150,
                difficulty: 'beginner',
                is_premium: false,
            });
        });
    });

    describe('Audio Generation', () => {
        it('should generate audio successfully', async () => {
            const mockAudioBuffer = new ArrayBuffer(1024);

            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                arrayBuffer: () => Promise.resolve(mockAudioBuffer),
            });

            const result = await contentGenerationService.generateAudio('Test text for audio generation');

            expect(result).toBeInstanceOf(Buffer);
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/audio/speech'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-api-key',
                        'Content-Type': 'application/json',
                    }),
                    body: expect.stringContaining('Test text for audio generation'),
                })
            );
        });

        it('should handle TTS API errors', async () => {
            (fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
            });

            await expect(
                contentGenerationService.generateAudio('Test text')
            ).rejects.toThrow('Failed to generate audio');
        });
    });

    describe('Validation', () => {
        it('should validate course structure correctly', async () => {
            const validStructure = {
                title: 'Valid Course Title',
                difficulty: 'beginner',
                estimatedDuration: 120,
                lessons: [
                    {
                        topic: 'Lesson 1',
                        duration: 30,
                        objectives: ['Objective 1', 'Objective 2'],
                    },
                    {
                        topic: 'Lesson 2',
                        duration: 30,
                        objectives: ['Objective 3', 'Objective 4'],
                    },
                ],
            };

            // Access private method for testing
            const validateMethod = (contentGenerationService as any).validateCourseStructure;
            const result = validateMethod(validStructure);

            expect(result).toEqual(validStructure);
        });

        it('should reject invalid course structure', async () => {
            const invalidStructure = {
                title: '', // Invalid: empty title
                difficulty: 'invalid', // Invalid: not a valid difficulty
                estimatedDuration: -10, // Invalid: negative duration
                lessons: [], // Invalid: no lessons
            };

            const validateMethod = (contentGenerationService as any).validateCourseStructure;

            expect(() => validateMethod(invalidStructure)).toThrow();
        });

        it('should validate lesson content correctly', async () => {
            const validContent = {
                title: 'Valid Lesson Title',
                content: 'Valid lesson content with sufficient detail',
                transcript: 'This is a valid transcript with enough content to be meaningful for audio generation',
                interactions: [
                    {
                        type: 'quiz',
                        prompt: 'What is the main concept?',
                        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
                        correct_answer: 'Option 1',
                        order: 1,
                    },
                ],
            };

            const validateMethod = (contentGenerationService as any).validateLessonContent;
            const result = validateMethod(validContent);

            expect(result).toEqual(validContent);
        });
    });

    describe('Error Handling', () => {
        it('should handle missing OpenAI API key', () => {
            // Mock missing API key
            jest.doMock('../../constants', () => ({
                ...jest.requireActual('../../constants'),
                ENV: {
                    ...jest.requireActual('../../constants').ENV,
                    OPENAI_API_KEY: '',
                },
            }));

            expect(() => {
                // Re-import to get the mocked version
                const { ContentGenerationService } = require('../contentGenerationService');
                new ContentGenerationService();
            }).toThrow('OpenAI API key is required');
        });

        it('should handle network timeouts', async () => {
            (fetch as jest.Mock).mockImplementation(() =>
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Network timeout')), 100)
                )
            );

            await expect(
                contentGenerationService.generateAudio('Test text')
            ).rejects.toThrow('Failed to generate audio');
        });
    });
});

describe('Integration Tests', () => {
    // These tests would run against actual APIs in a test environment
    describe.skip('Real API Integration', () => {
        it('should generate actual content with OpenAI', async () => {
            // This test would use real API keys and make actual requests
            // Skip by default to avoid API costs during regular testing
        });

        it('should upload audio to Supabase storage', async () => {
            // This test would use real Supabase instance
            // Skip by default to avoid storage costs during regular testing
        });
    });
});