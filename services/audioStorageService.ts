import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { LEARNING_CONFIG, STORAGE_CONFIG, STORAGE_KEYS } from '../constants';
import { APIResponse, Lesson } from '../types';
import { storageService } from './storageService';
import { supabaseService } from './supabaseService';

export interface AudioCacheInfo {
    lessonId: string;
    localPath: string;
    remoteUrl: string;
    size: number;
    quality: 'standard' | 'high';
    downloadedAt: string;
    lastAccessedAt: string;
}

export interface AudioUploadResult {
    url: string;
    path: string;
    size: number;
    duration?: number;
}

export class AudioStorageService {
    private cacheDir: string;
    private maxCacheSize: number;

    constructor() {
        this.cacheDir = `${RNFS.DocumentDirectoryPath}/audio`;
        this.maxCacheSize = LEARNING_CONFIG.MAX_OFFLINE_STORAGE * 1024 * 1024; // Convert MB to bytes
        this.initializeCache();
    }

    /**
     * Initialize audio cache directory
     */
    private async initializeCache(): Promise<void> {
        try {
            const exists = await RNFS.exists(this.cacheDir);
            if (!exists) {
                await RNFS.mkdir(this.cacheDir);
            }
        } catch (error) {
            console.error('Initialize Cache Error:', error);
        }
    }

    /**
     * Upload audio file with optimized settings
     */
    async uploadLessonAudio(
        audioBuffer: ArrayBuffer,
        lessonId: string,
        courseId: string,
        options: {
            quality?: 'standard' | 'high';
            metadata?: Record<string, any>;
        } = {}
    ): Promise<APIResponse<AudioUploadResult>> {
        try {
            const { quality = 'standard', metadata = {} } = options;

            // Generate optimized file path
            const fileName = `${lessonId}.mp3`;
            const filePath = `courses/${courseId}/lessons/${fileName}`;

            // Add lesson metadata
            const uploadMetadata = {
                lesson_id: lessonId,
                course_id: courseId,
                quality,
                ...metadata
            };

            // Upload using both services for redundancy
            const [supabaseResult, s3Result] = await Promise.allSettled([
                supabaseService.uploadAudio(audioBuffer, filePath, {
                    bucket: STORAGE_CONFIG.BUCKETS.LESSON_AUDIO,
                    quality,
                    metadata: uploadMetadata
                }),
                storageService.uploadAudio(audioBuffer, filePath, {
                    bucket: STORAGE_CONFIG.BUCKETS.LESSON_AUDIO,
                    quality,
                    metadata: uploadMetadata
                })
            ]);

            // Use Supabase result as primary, S3 as fallback
            let result: APIResponse<string>;
            if (supabaseResult.status === 'fulfilled' && supabaseResult.value.data) {
                result = supabaseResult.value;
            } else if (s3Result.status === 'fulfilled' && s3Result.value.data) {
                result = s3Result.value;
            } else {
                throw new Error('Both upload methods failed');
            }

            if (result.error) {
                throw new Error(result.error);
            }

            return {
                data: {
                    url: result.data!,
                    path: filePath,
                    size: audioBuffer.byteLength,
                }
            };

        } catch (error) {
            console.error('Upload Lesson Audio Error:', error);
            return { error: error.message };
        }
    }

    /**
     * Download and cache audio file for offline use
     */
    async downloadAndCacheAudio(
        audioUrl: string,
        lessonId: string,
        quality: 'standard' | 'high' = 'standard'
    ): Promise<APIResponse<string>> {
        try {
            const fileName = `${lessonId}_${quality}.mp3`;
            const localPath = `${this.cacheDir}/${fileName}`;

            // Check if already cached
            const exists = await RNFS.exists(localPath);
            if (exists) {
                await this.updateAccessTime(lessonId);
                return { data: localPath };
            }

            // Check cache space before downloading
            await this.manageCacheSpace();

            // Download file
            const downloadResult = await RNFS.downloadFile({
                fromUrl: audioUrl,
                toFile: localPath,
                headers: {
                    'Authorization': `Bearer ${supabaseService.getClient().supabaseKey}`,
                },
            }).promise;

            if (downloadResult.statusCode !== 200) {
                throw new Error(`Download failed with status: ${downloadResult.statusCode}`);
            }

            // Get file stats
            const stats = await RNFS.stat(localPath);

            // Update cache info
            const cacheInfo: AudioCacheInfo = {
                lessonId,
                localPath,
                remoteUrl: audioUrl,
                size: parseInt(stats.size),
                quality,
                downloadedAt: new Date().toISOString(),
                lastAccessedAt: new Date().toISOString(),
            };

            await this.updateCacheInfo(lessonId, cacheInfo);

            return { data: localPath };

        } catch (error) {
            console.error('Download and Cache Audio Error:', error);
            return { error: error.message };
        }
    }

    /**
     * Get cached audio file path
     */
    async getCachedAudioPath(lessonId: string, quality: 'standard' | 'high' = 'standard'): Promise<string | null> {
        try {
            const fileName = `${lessonId}_${quality}.mp3`;
            const localPath = `${this.cacheDir}/${fileName}`;

            const exists = await RNFS.exists(localPath);
            if (exists) {
                await this.updateAccessTime(lessonId);
                return localPath;
            }

            return null;
        } catch (error) {
            console.error('Get Cached Audio Path Error:', error);
            return null;
        }
    }

    /**
     * Preload lessons for offline use
     */
    async preloadLessons(lessons: Lesson[], quality: 'standard' | 'high' = 'standard'): Promise<APIResponse<string[]>> {
        try {
            const downloadPromises = lessons
                .filter(lesson => lesson.audio_url)
                .slice(0, LEARNING_CONFIG.LESSON_BUFFER_COUNT)
                .map(lesson => this.downloadAndCacheAudio(lesson.audio_url!, lesson.id, quality));

            const results = await Promise.allSettled(downloadPromises);
            const cachedPaths: string[] = [];
            const errors: string[] = [];

            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value.data) {
                    cachedPaths.push(result.value.data);
                } else {
                    const error = result.status === 'rejected' ? result.reason : result.value.error;
                    errors.push(`Lesson ${lessons[index].id}: ${error}`);
                }
            });

            if (errors.length > 0) {
                console.warn('Some preloads failed:', errors);
            }

            return { data: cachedPaths };

        } catch (error) {
            console.error('Preload Lessons Error:', error);
            return { error: error.message };
        }
    }

    /**
     * Delete cached audio file
     */
    async deleteCachedAudio(lessonId: string): Promise<APIResponse<boolean>> {
        try {
            const cacheInfo = await this.getCacheInfo(lessonId);
            if (!cacheInfo) {
                return { data: true }; // Already deleted
            }

            const exists = await RNFS.exists(cacheInfo.localPath);
            if (exists) {
                await RNFS.unlink(cacheInfo.localPath);
            }

            await this.removeCacheInfo(lessonId);

            return { data: true };

        } catch (error) {
            console.error('Delete Cached Audio Error:', error);
            return { error: error.message };
        }
    }

    /**
     * Get cache statistics
     */
    async getCacheStats(): Promise<APIResponse<{
        totalFiles: number;
        totalSize: number;
        availableSpace: number;
        oldestFile: string | null;
        newestFile: string | null;
    }>> {
        try {
            const cacheInfos = await this.getAllCacheInfo();
            const totalFiles = cacheInfos.length;
            const totalSize = cacheInfos.reduce((sum, info) => sum + info.size, 0);
            const availableSpace = this.maxCacheSize - totalSize;

            const sortedByDate = cacheInfos.sort((a, b) =>
                new Date(a.downloadedAt).getTime() - new Date(b.downloadedAt).getTime()
            );

            const oldestFile = sortedByDate.length > 0 ? sortedByDate[0].lessonId : null;
            const newestFile = sortedByDate.length > 0 ? sortedByDate[sortedByDate.length - 1].lessonId : null;

            return {
                data: {
                    totalFiles,
                    totalSize,
                    availableSpace,
                    oldestFile,
                    newestFile,
                }
            };

        } catch (error) {
            console.error('Get Cache Stats Error:', error);
            return { error: error.message };
        }
    }

    /**
     * Clean up old cached files
     */
    async cleanupCache(forceCleanup: boolean = false): Promise<APIResponse<number>> {
        try {
            const stats = await this.getCacheStats();
            if (stats.error) {
                throw new Error(stats.error);
            }

            const { totalSize, availableSpace } = stats.data!;
            const usageRatio = totalSize / this.maxCacheSize;

            // Only cleanup if we're over threshold or forced
            if (!forceCleanup && usageRatio < LEARNING_CONFIG.SYNC_INTERVAL) {
                return { data: 0 };
            }

            const cacheInfos = await this.getAllCacheInfo();

            // Sort by last accessed time (oldest first)
            const sortedByAccess = cacheInfos.sort((a, b) =>
                new Date(a.lastAccessedAt).getTime() - new Date(b.lastAccessedAt).getTime()
            );

            let deletedCount = 0;
            let freedSpace = 0;
            const targetSpace = this.maxCacheSize * 0.3; // Free up 30% of cache

            for (const cacheInfo of sortedByAccess) {
                if (freedSpace >= targetSpace && !forceCleanup) {
                    break;
                }

                const deleteResult = await this.deleteCachedAudio(cacheInfo.lessonId);
                if (deleteResult.data) {
                    deletedCount++;
                    freedSpace += cacheInfo.size;
                }
            }

            return { data: deletedCount };

        } catch (error) {
            console.error('Cleanup Cache Error:', error);
            return { error: error.message };
        }
    }

    /**
     * Manage cache space before downloading
     */
    private async manageCacheSpace(): Promise<void> {
        const stats = await this.getCacheStats();
        if (stats.error) return;

        const { totalSize } = stats.data!;
        const usageRatio = totalSize / this.maxCacheSize;

        if (usageRatio > 0.8) { // 80% full
            await this.cleanupCache();
        }
    }

    /**
     * Update cache info for a lesson
     */
    private async updateCacheInfo(lessonId: string, cacheInfo: AudioCacheInfo): Promise<void> {
        try {
            const allCacheInfo = await this.getAllCacheInfo();
            const updatedCache = allCacheInfo.filter(info => info.lessonId !== lessonId);
            updatedCache.push(cacheInfo);

            await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_LESSONS, JSON.stringify(updatedCache));
        } catch (error) {
            console.error('Update Cache Info Error:', error);
        }
    }

    /**
     * Get cache info for a specific lesson
     */
    private async getCacheInfo(lessonId: string): Promise<AudioCacheInfo | null> {
        try {
            const allCacheInfo = await this.getAllCacheInfo();
            return allCacheInfo.find(info => info.lessonId === lessonId) || null;
        } catch (error) {
            console.error('Get Cache Info Error:', error);
            return null;
        }
    }

    /**
     * Get all cache info
     */
    private async getAllCacheInfo(): Promise<AudioCacheInfo[]> {
        try {
            const cacheData = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_LESSONS);
            return cacheData ? JSON.parse(cacheData) : [];
        } catch (error) {
            console.error('Get All Cache Info Error:', error);
            return [];
        }
    }

    /**
     * Remove cache info for a lesson
     */
    private async removeCacheInfo(lessonId: string): Promise<void> {
        try {
            const allCacheInfo = await this.getAllCacheInfo();
            const filteredCache = allCacheInfo.filter(info => info.lessonId !== lessonId);
            await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_LESSONS, JSON.stringify(filteredCache));
        } catch (error) {
            console.error('Remove Cache Info Error:', error);
        }
    }

    /**
     * Update last accessed time for a lesson
     */
    private async updateAccessTime(lessonId: string): Promise<void> {
        try {
            const cacheInfo = await this.getCacheInfo(lessonId);
            if (cacheInfo) {
                cacheInfo.lastAccessedAt = new Date().toISOString();
                await this.updateCacheInfo(lessonId, cacheInfo);
            }
        } catch (error) {
            console.error('Update Access Time Error:', error);
        }
    }

    /**
     * Check if audio is cached
     */
    async isAudioCached(lessonId: string, quality: 'standard' | 'high' = 'standard'): Promise<boolean> {
        const cachedPath = await this.getCachedAudioPath(lessonId, quality);
        return cachedPath !== null;
    }

    /**
     * Get audio URL (cached or remote)
     */
    async getAudioUrl(lesson: Lesson, quality: 'standard' | 'high' = 'standard'): Promise<string | null> {
        // First try to get cached version
        const cachedPath = await this.getCachedAudioPath(lesson.id, quality);
        if (cachedPath) {
            return `file://${cachedPath}`;
        }

        // Return remote URL if available
        return lesson.audio_url || null;
    }

    /**
     * Sync cached files with remote storage
     */
    async syncCachedFiles(): Promise<APIResponse<{
        synced: number;
        failed: number;
        removed: number;
    }>> {
        try {
            const cacheInfos = await this.getAllCacheInfo();
            let synced = 0;
            let failed = 0;
            let removed = 0;

            for (const cacheInfo of cacheInfos) {
                try {
                    // Check if remote file still exists
                    const response = await fetch(cacheInfo.remoteUrl, { method: 'HEAD' });

                    if (response.ok) {
                        synced++;
                    } else if (response.status === 404) {
                        // Remote file deleted, remove from cache
                        await this.deleteCachedAudio(cacheInfo.lessonId);
                        removed++;
                    } else {
                        failed++;
                    }
                } catch (error) {
                    failed++;
                }
            }

            return {
                data: {
                    synced,
                    failed,
                    removed,
                }
            };

        } catch (error) {
            console.error('Sync Cached Files Error:', error);
            return { error: error.message };
        }
    }
}

// Export singleton instance
export const audioStorageService = new AudioStorageService();