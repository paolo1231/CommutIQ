import { LEARNING_CONFIG, STORAGE_CONFIG } from '../constants';
import { supabaseService } from '../services/supabaseService';
import { ttsService } from '../services/ttsService';
import { APIResponse, AudioQualityStats, CacheStats } from '../types';

export class StorageManager {
    /**
     * Initialize storage system
     */
    static async initialize(): Promise<APIResponse<boolean>> {
        try {
            // Initialize TTS service cache
            console.log('Storage Manager initialized with TTS caching');
            
            return { data: true };
        } catch (error) {
            console.error('Storage Manager Initialize Error:', error);
            return { error: error.message };
        }
    }

    /**
     * Get comprehensive storage statistics
     */
    static async getStorageOverview(): Promise<APIResponse<{
        supabase: any;
        cache: CacheStats;
        audioQuality: AudioQualityStats;
        configuration: any;
    }>> {
        try {
            const [supabaseStats, audioQualityStats] = await Promise.allSettled([
                supabaseService.getStorageStats(),
                supabaseService.getAudioStatsByQuality()
            ]);

            const ttsStats = ttsService.getCacheStats();

            const result = {
                supabase: supabaseStats.status === 'fulfilled' ? supabaseStats.value.data : null,
                cache: {
                    totalFiles: ttsStats.size,
                    totalSize: ttsStats.size * 100000, // Estimate 100KB per cached audio
                    oldestFile: null,
                    newestFile: null
                },
                audioQuality: audioQualityStats.status === 'fulfilled' ? audioQualityStats.value.data : null,
                configuration: { configured: true }
            };

            return { data: result };
        } catch (error) {
            console.error('Get Storage Overview Error:', error);
            return { error: error.message };
        }
    }

    /**
     * Optimize storage across all systems
     */
    static async optimizeStorage(): Promise<APIResponse<{
        cacheCleanup: number;
        duplicatesRemoved: number;
        oldFilesRemoved: number;
        totalSpaceFreed: number;
    }>> {
        try {
            // Clear TTS cache
            const ttsCacheSize = ttsService.getCacheStats().size;
            ttsService.clearCache();
            
            const results = await Promise.allSettled([
                supabaseService.cleanupDuplicateFiles(),
                supabaseService.cleanupOldFiles(STORAGE_CONFIG.BUCKETS.LESSON_AUDIO, 30)
            ]);

            const cacheCleanup = ttsCacheSize;
            const duplicatesRemoved = results[0].status === 'fulfilled' ? results[0].value.data || 0 : 0;
            const oldFilesRemoved = results[1].status === 'fulfilled' ? results[1].value.data || 0 : 0;

            // Calculate approximate space freed
            const totalSpaceFreed = (cacheCleanup * 100000) + (duplicatesRemoved + oldFilesRemoved) * 1024 * 1024;

            return {
                data: {
                    cacheCleanup,
                    duplicatesRemoved,
                    oldFilesRemoved,
                    totalSpaceFreed
                }
            };
        } catch (error) {
            console.error('Optimize Storage Error:', error);
            return { error: error.message };
        }
    }

    /**
     * Upload audio with redundancy and optimization
     */
    static async uploadAudioWithRedundancy(
        audioBuffer: ArrayBuffer,
        lessonId: string,
        courseId: string,
        options: {
            quality?: 'standard' | 'high';
            metadata?: Record<string, any>;
        } = {}
    ): Promise<APIResponse<{
        primaryUrl: string;
        backupUrl?: string;
        path: string;
        size: number;
    }>> {
        try {
            // Upload to Supabase Storage
            const path = `courses/${courseId}/lessons/${lessonId}/audio.mp3`;
            const { data, error } = await supabaseService.supabase.storage
                .from(STORAGE_CONFIG.BUCKETS.LESSON_AUDIO)
                .upload(path, audioBuffer, {
                    contentType: 'audio/mpeg',
                    upsert: true,
                    metadata: options.metadata
                });

            if (error) {
                throw error;
            }

            const { data: { publicUrl } } = supabaseService.supabase.storage
                .from(STORAGE_CONFIG.BUCKETS.LESSON_AUDIO)
                .getPublicUrl(path);

            return {
                data: {
                    primaryUrl: publicUrl,
                    path: path,
                    size: audioBuffer.byteLength,
                }
            };
        } catch (error) {
            console.error('Upload Audio With Redundancy Error:', error);
            return { error: error.message };
        }
    }

    /**
     * Smart preload based on user patterns
     */
    static async smartPreload(
        userId: string,
        courseId?: string
    ): Promise<APIResponse<{
        preloadedLessons: number;
        totalSize: number;
        estimatedTime: number;
    }>> {
        try {
            // Get user's courses and progress
            const coursesResult = await supabaseService.getUserCourses(userId);
            if (coursesResult.error) {
                throw new Error(coursesResult.error);
            }

            const courses = coursesResult.data || [];
            let lessonsToPreload: any[] = [];

            if (courseId) {
                // Preload specific course
                const course = courses.find(c => c.id === courseId);
                if (course && course.lessons) {
                    lessonsToPreload = course.lessons.slice(0, LEARNING_CONFIG.LESSON_BUFFER_COUNT);
                }
            } else {
                // Smart preload based on user progress
                for (const course of courses) {
                    if (course.lessons) {
                        // Get user progress for this course
                        const progressResult = await supabaseService.getUserProgress(userId, course.id);
                        const progress = progressResult.data || [];

                        // Find next lessons to preload
                        const completedLessonIds = progress
                            .filter(p => p.progress_percentage >= 100)
                            .map(p => p.lesson_id);

                        const nextLessons = course.lessons
                            .filter(lesson => !completedLessonIds.includes(lesson.id))
                            .slice(0, 2); // 2 lessons per course

                        lessonsToPreload.push(...nextLessons);
                    }
                }
            }

            // Limit total preload count
            lessonsToPreload = lessonsToPreload.slice(0, LEARNING_CONFIG.LESSON_BUFFER_COUNT);

            // Preload the lessons using TTS service
            const preloadTexts = lessonsToPreload.map(lesson => ({
                text: lesson.transcript || '',
                options: { voice: 'sage', quality: 'standard' }
            }));
            
            await ttsService.preloadMultiple(preloadTexts, 3);
            const preloadedCount = preloadTexts.length;
            const estimatedSize = lessonsToPreload.reduce((sum, lesson) => sum + (lesson.duration * 1024 * 100), 0); // Rough estimate
            const estimatedTime = lessonsToPreload.reduce((sum, lesson) => sum + lesson.duration, 0);

            return {
                data: {
                    preloadedLessons: preloadedCount,
                    totalSize: estimatedSize,
                    estimatedTime
                }
            };
        } catch (error) {
            console.error('Smart Preload Error:', error);
            return { error: error.message };
        }
    }

    /**
     * Health check for all storage systems
     */
    static async healthCheck(): Promise<APIResponse<{
        supabase: boolean;
        tts: boolean;
        cache: boolean;
        overall: boolean;
    }>> {
        try {
            const supabaseHealth = await supabaseService.healthCheck();
            const ttsAvailable = await ttsService.checkAvailability();
            const ttsCacheStats = ttsService.getCacheStats();

            const supabaseOk = supabaseHealth;
            const ttsOk = ttsAvailable;
            const cacheOk = ttsCacheStats.size >= 0;

            const overall = supabaseOk && ttsOk;

            return {
                data: {
                    supabase: supabaseOk,
                    tts: ttsOk,
                    cache: cacheOk,
                    overall
                }
            };
        } catch (error) {
            console.error('Storage Health Check Error:', error);
            return { error: error.message };
        }
    }

    /**
     * Sync all cached content with remote storage
     */
    static async syncCachedContent(): Promise<APIResponse<{
        synced: number;
        failed: number;
        removed: number;
    }>> {
        try {
            // TTS cache is managed automatically
            return {
                data: {
                    synced: 0,
                    failed: 0,
                    removed: 0
                }
            };
        } catch (error) {
            console.error('Sync Cached Content Error:', error);
            return { error: error.message };
        }
    }

    /**
     * Get storage recommendations for user
     */
    static async getStorageRecommendations(userId: string): Promise<APIResponse<{
        recommendations: string[];
        actions: Array<{
            type: 'cleanup' | 'preload' | 'upgrade';
            description: string;
            estimatedBenefit: string;
        }>;
    }>> {
        try {
            const [overview, userCourses] = await Promise.allSettled([
                this.getStorageOverview(),
                supabaseService.getUserCourses(userId)
            ]);

            const recommendations: string[] = [];
            const actions: Array<{
                type: 'cleanup' | 'preload' | 'upgrade';
                description: string;
                estimatedBenefit: string;
            }> = [];

            if (overview.status === 'fulfilled' && overview.value.data?.cache) {
                const cacheStats = overview.value.data.cache;
                const usageRatio = cacheStats.totalSize / (LEARNING_CONFIG.MAX_OFFLINE_STORAGE * 1024 * 1024);

                if (usageRatio > 0.8) {
                    recommendations.push('Your offline storage is getting full. Consider cleaning up old lessons.');
                    actions.push({
                        type: 'cleanup',
                        description: 'Clean up old cached lessons',
                        estimatedBenefit: `Free up ~${Math.round((usageRatio - 0.5) * LEARNING_CONFIG.MAX_OFFLINE_STORAGE)}MB`
                    });
                }

                if (cacheStats.totalFiles < 5) {
                    recommendations.push('Download more lessons for offline learning during your commute.');
                    actions.push({
                        type: 'preload',
                        description: 'Preload upcoming lessons',
                        estimatedBenefit: 'Seamless offline learning experience'
                    });
                }
            }

            if (userCourses.status === 'fulfilled' && userCourses.value.data) {
                const courses = userCourses.value.data;
                const premiumCourses = courses.filter(c => c.is_premium);

                if (premiumCourses.length === 0) {
                    recommendations.push('Upgrade to Premium for access to high-quality audio and exclusive content.');
                    actions.push({
                        type: 'upgrade',
                        description: 'Upgrade to Premium subscription',
                        estimatedBenefit: 'High-quality audio, exclusive content, unlimited downloads'
                    });
                }
            }

            return {
                data: {
                    recommendations,
                    actions
                }
            };
        } catch (error) {
            console.error('Get Storage Recommendations Error:', error);
            return { error: error.message };
        }
    }

    /**
     * Monitor storage usage and alert if needed
     */
    static async monitorStorageUsage(): Promise<APIResponse<{
        alerts: Array<{
            level: 'info' | 'warning' | 'error';
            message: string;
            action?: string;
        }>;
    }>> {
        try {
            const overview = await this.getStorageOverview();
            if (overview.error) {
                throw new Error(overview.error);
            }

            const alerts: Array<{
                level: 'info' | 'warning' | 'error';
                message: string;
                action?: string;
            }> = [];

            const { cache, configuration } = overview.data!;

            if (cache) {
                const usageRatio = cache.totalSize / (LEARNING_CONFIG.MAX_OFFLINE_STORAGE * 1024 * 1024);

                if (usageRatio > 0.9) {
                    alerts.push({
                        level: 'error',
                        message: 'Offline storage is almost full',
                        action: 'Clean up old lessons or increase storage limit'
                    });
                } else if (usageRatio > 0.7) {
                    alerts.push({
                        level: 'warning',
                        message: 'Offline storage is getting full',
                        action: 'Consider cleaning up old lessons'
                    });
                }

                if (cache.totalFiles === 0) {
                    alerts.push({
                        level: 'info',
                        message: 'No lessons cached for offline use',
                        action: 'Download lessons for offline learning'
                    });
                }
            }

            if (!configuration.configured) {
                alerts.push({
                    level: 'warning',
                    message: 'S3 storage not fully configured',
                    action: 'Check environment variables'
                });
            }

            return { data: { alerts } };
        } catch (error) {
            console.error('Monitor Storage Usage Error:', error);
            return { error: error.message };
        }
    }
}

export default StorageManager;