import { ENV, STORAGE_CONFIG } from '../constants';
import { APIResponse } from '../types';

export interface StorageUploadOptions {
    bucket?: string;
    quality?: 'standard' | 'high';
    contentType?: string;
    metadata?: Record<string, any>;
    cacheControl?: string;
    contentEncoding?: string;
}

export interface StorageListOptions {
    limit?: number;
    offset?: number;
    prefix?: string;
    delimiter?: string;
}

export interface StorageFile {
    name: string;
    id: string;
    updated_at: string;
    created_at: string;
    last_accessed_at: string;
    metadata: {
        eTag: string;
        size: number;
        mimetype: string;
        cacheControl: string;
        lastModified: string;
        contentLength: number;
        httpStatusCode: number;
        quality?: string;
        uploaded_at?: string;
        cdn_optimized?: boolean;
        cache_status?: string;
    };
}

export class StorageService {
    private s3BaseUrl: string;
    private region: string;
    private accessId: string;
    private accessKey: string;

    constructor() {
        this.s3BaseUrl = ENV.S3_STORAGE_URL;
        this.region = ENV.S3_REGION;
        this.accessId = ENV.S3_ACCESS_ID;
        this.accessKey = ENV.S3_ACCESS_KEY;

        if (!this.s3BaseUrl || !this.accessId || !this.accessKey) {
            console.warn('⚠️  S3 Storage configuration is incomplete');
        }
    }

    /**
     * Upload audio file to S3 storage with optimized settings
     */
    async uploadAudio(
        audioBuffer: ArrayBuffer,
        path: string,
        options: StorageUploadOptions = {}
    ): Promise<APIResponse<string>> {
        try {
            const {
                bucket = STORAGE_CONFIG.BUCKETS.LESSON_AUDIO,
                quality = STORAGE_CONFIG.QUALITY_LEVELS.STANDARD,
                contentType = 'audio/mpeg',
                metadata = {},
                cacheControl = STORAGE_CONFIG.CDN_CONFIG.CACHE_CONTROL,
                contentEncoding = STORAGE_CONFIG.CDN_CONFIG.CONTENT_ENCODING
            } = options;

            // Validate file size
            const maxSize = STORAGE_CONFIG.MAX_FILE_SIZE.LESSON_AUDIO;
            if (audioBuffer.byteLength > maxSize) {
                throw new Error(`File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`);
            }

            // Validate content type
            if (!STORAGE_CONFIG.AUDIO_FORMATS.includes(contentType)) {
                throw new Error(`Unsupported audio format: ${contentType}`);
            }

            // Prepare headers
            const headers = new Headers({
                'Content-Type': contentType,
                'Content-Length': audioBuffer.byteLength.toString(),
                'Cache-Control': cacheControl,
                'Content-Encoding': contentEncoding,
                'x-amz-meta-quality': quality,
                'x-amz-meta-uploaded-at': new Date().toISOString(),
                'x-amz-meta-size': audioBuffer.byteLength.toString(),
            });

            // Add custom metadata
            Object.entries(metadata).forEach(([key, value]) => {
                headers.set(`x-amz-meta-${key}`, String(value));
            });

            // Add authentication headers
            await this.addAuthHeaders(headers, 'PUT', `/${bucket}/${path}`);

            const response = await fetch(`${this.s3BaseUrl}/${bucket}/${path}`, {
                method: 'PUT',
                headers,
                body: audioBuffer,
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
            }

            // Return the public URL
            const publicUrl = `${this.s3BaseUrl}/${bucket}/${path}`;
            return { data: publicUrl };

        } catch (error) {
            console.error('Storage Upload Error:', error);
            return { error: error.message };
        }
    }

    /**
     * Download audio file from S3 storage
     */
    async downloadAudio(path: string, bucket: string = STORAGE_CONFIG.BUCKETS.LESSON_AUDIO): Promise<APIResponse<ArrayBuffer>> {
        try {
            const headers = new Headers();
            await this.addAuthHeaders(headers, 'GET', `/${bucket}/${path}`);

            const response = await fetch(`${this.s3BaseUrl}/${bucket}/${path}`, {
                method: 'GET',
                headers,
            });

            if (!response.ok) {
                throw new Error(`Download failed: ${response.status} ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            return { data: arrayBuffer };

        } catch (error) {
            console.error('Storage Download Error:', error);
            return { error: error.message };
        }
    }

    /**
     * Get public URL for audio file
     */
    async getAudioUrl(path: string, bucket: string = STORAGE_CONFIG.BUCKETS.LESSON_AUDIO): Promise<APIResponse<string>> {
        try {
            const publicUrl = `${this.s3BaseUrl}/${bucket}/${path}`;
            return { data: publicUrl };
        } catch (error) {
            console.error('Get Audio URL Error:', error);
            return { error: error.message };
        }
    }

    /**
     * Delete audio file from S3 storage
     */
    async deleteAudio(path: string, bucket: string = STORAGE_CONFIG.BUCKETS.LESSON_AUDIO): Promise<APIResponse<boolean>> {
        try {
            const headers = new Headers();
            await this.addAuthHeaders(headers, 'DELETE', `/${bucket}/${path}`);

            const response = await fetch(`${this.s3BaseUrl}/${bucket}/${path}`, {
                method: 'DELETE',
                headers,
            });

            if (!response.ok) {
                throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
            }

            return { data: true };

        } catch (error) {
            console.error('Storage Delete Error:', error);
            return { error: error.message };
        }
    }

    /**
     * List files in S3 bucket
     */
    async listFiles(
        bucket: string = STORAGE_CONFIG.BUCKETS.LESSON_AUDIO,
        options: StorageListOptions = {}
    ): Promise<APIResponse<StorageFile[]>> {
        try {
            const {
                limit = 100,
                offset = 0,
                prefix = '',
                delimiter = ''
            } = options;

            const params = new URLSearchParams({
                'list-type': '2',
                'max-keys': limit.toString(),
                ...(prefix && { prefix }),
                ...(delimiter && { delimiter }),
                ...(offset > 0 && { 'continuation-token': offset.toString() })
            });

            const headers = new Headers();
            await this.addAuthHeaders(headers, 'GET', `/${bucket}?${params.toString()}`);

            const response = await fetch(`${this.s3BaseUrl}/${bucket}?${params.toString()}`, {
                method: 'GET',
                headers,
            });

            if (!response.ok) {
                throw new Error(`List files failed: ${response.status} ${response.statusText}`);
            }

            const xmlText = await response.text();
            const files = this.parseS3ListResponse(xmlText);

            return { data: files };

        } catch (error) {
            console.error('Storage List Files Error:', error);
            return { error: error.message };
        }
    }

    /**
     * Get file metadata
     */
    async getFileMetadata(path: string, bucket: string = STORAGE_CONFIG.BUCKETS.LESSON_AUDIO): Promise<APIResponse<any>> {
        try {
            const headers = new Headers();
            await this.addAuthHeaders(headers, 'HEAD', `/${bucket}/${path}`);

            const response = await fetch(`${this.s3BaseUrl}/${bucket}/${path}`, {
                method: 'HEAD',
                headers,
            });

            if (!response.ok) {
                throw new Error(`Get metadata failed: ${response.status} ${response.statusText}`);
            }

            const metadata = {
                contentType: response.headers.get('content-type'),
                contentLength: parseInt(response.headers.get('content-length') || '0'),
                lastModified: response.headers.get('last-modified'),
                etag: response.headers.get('etag'),
                cacheControl: response.headers.get('cache-control'),
                quality: response.headers.get('x-amz-meta-quality'),
                uploadedAt: response.headers.get('x-amz-meta-uploaded-at'),
                size: response.headers.get('x-amz-meta-size'),
            };

            return { data: metadata };

        } catch (error) {
            console.error('Get File Metadata Error:', error);
            return { error: error.message };
        }
    }

    /**
     * Generate presigned URL for temporary access
     */
    async generatePresignedUrl(
        path: string,
        bucket: string = STORAGE_CONFIG.BUCKETS.LESSON_AUDIO,
        expiresIn: number = 3600 // 1 hour
    ): Promise<APIResponse<string>> {
        try {
            // For now, return the public URL since Supabase Storage handles access control
            // In a full S3 implementation, this would generate a signed URL with expiration
            const publicUrl = `${this.s3BaseUrl}/${bucket}/${path}`;
            return { data: publicUrl };

        } catch (error) {
            console.error('Generate Presigned URL Error:', error);
            return { error: error.message };
        }
    }

    /**
     * Batch upload multiple files
     */
    async batchUpload(
        files: Array<{ path: string; buffer: ArrayBuffer; options?: StorageUploadOptions }>
    ): Promise<APIResponse<string[]>> {
        try {
            const uploadPromises = files.map(({ path, buffer, options }) =>
                this.uploadAudio(buffer, path, options)
            );

            const results = await Promise.allSettled(uploadPromises);
            const urls: string[] = [];
            const errors: string[] = [];

            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value.data) {
                    urls.push(result.value.data);
                } else {
                    const error = result.status === 'rejected' ? result.reason : result.value.error;
                    errors.push(`File ${files[index].path}: ${error}`);
                }
            });

            if (errors.length > 0) {
                console.warn('Some uploads failed:', errors);
            }

            return { data: urls };

        } catch (error) {
            console.error('Batch Upload Error:', error);
            return { error: error.message };
        }
    }

    /**
     * Add authentication headers for S3 requests
     */
    private async addAuthHeaders(headers: Headers, method: string, path: string): Promise<void> {
        // For Supabase Storage, we use the anon key for authentication
        // In a full S3 implementation, this would generate AWS signature v4
        headers.set('Authorization', `Bearer ${ENV.SUPABASE_ANON_KEY}`);
        headers.set('apikey', ENV.SUPABASE_ANON_KEY);
    }

    /**
     * Parse S3 list response XML
     */
    private parseS3ListResponse(xmlText: string): StorageFile[] {
        // This is a simplified parser for the S3 list response
        // In a production environment, you'd use a proper XML parser
        const files: StorageFile[] = [];

        try {
            // For now, return empty array as Supabase handles this differently
            // This would be implemented for direct S3 integration
            return files;
        } catch (error) {
            console.error('Parse S3 Response Error:', error);
            return files;
        }
    }

    /**
     * Validate storage configuration
     */
    isConfigured(): boolean {
        return !!(this.s3BaseUrl && this.accessId && this.accessKey);
    }

    /**
     * Get storage configuration info
     */
    getConfig() {
        return {
            baseUrl: this.s3BaseUrl,
            region: this.region,
            configured: this.isConfigured(),
            buckets: STORAGE_CONFIG.BUCKETS,
            maxFileSizes: STORAGE_CONFIG.MAX_FILE_SIZE,
            supportedFormats: STORAGE_CONFIG.AUDIO_FORMATS,
        };
    }
}

// Export singleton instance
export const storageService = new StorageService();