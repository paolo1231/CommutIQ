# CommutIQ Storage Setup Documentation

## Overview

CommutIQ uses a hybrid storage approach combining Supabase Storage with direct S3 integration for optimal performance, reliability, and global content delivery. This document outlines the complete storage implementation for Task 2.3.

## Architecture

### Storage Layers

1. **Supabase Storage** - Primary storage with built-in CDN and authentication
2. **Direct S3 Integration** - Advanced operations and redundancy
3. **Local Caching** - Offline audio storage for seamless commute learning
4. **Storage Management** - Intelligent optimization and monitoring

### Key Components

```
services/
├── supabaseService.ts      # Enhanced with storage operations
├── storageService.ts       # Direct S3 integration
├── audioStorageService.ts  # Audio-specific storage management
└── utils/storageManager.ts # Unified storage orchestration
```

## Configuration

### Environment Variables

The storage system uses the following environment variables from your `.env` file:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://qjeavwwdqpoahzuvqniz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# S3 Storage Configuration
S3_STORAGE_URL=https://qjeavwwdqpoahzuvqniz.storage.supabase.co/storage/v1/s3
S3_REGION=us-west-1
S3_ACCESS_ID=your_s3_access_id
S3_ACCESS_KEY=your_s3_access_key
```

### Storage Buckets

Two main storage buckets are configured:

1. **lesson-audio** (Public)
   - AI-generated lesson audio files
   - 50MB file size limit
   - Public read access with CDN optimization
   - Supports: MP3, WAV, OGG formats

2. **user-uploads** (Private)
   - User-generated content
   - 10MB file size limit
   - Private access with user-specific folders
   - Row-level security enabled

## Features Implemented

### ✅ Core Storage Operations

- **Audio Upload**: Multi-quality upload with metadata
- **Audio Download**: Efficient streaming and caching
- **File Management**: List, delete, and organize audio files
- **URL Generation**: Public and presigned URL generation

### ✅ Advanced Features

- **CDN Optimization**: Global content delivery with caching
- **Quality Management**: Standard and high-quality audio variants
- **Metadata Tracking**: Upload timestamps, quality levels, file sizes
- **Duplicate Detection**: Automatic cleanup of duplicate files
- **Storage Analytics**: Comprehensive usage statistics

### ✅ Offline Capabilities

- **Smart Caching**: Intelligent lesson preloading
- **Cache Management**: Automatic cleanup and space optimization
- **Offline Sync**: Progress tracking when offline
- **Storage Monitoring**: Real-time usage alerts

### ✅ Performance Optimizations

- **Batch Operations**: Multiple file uploads/downloads
- **Compression**: Optimized audio encoding
- **Lazy Loading**: On-demand content loading
- **Background Sync**: Non-blocking synchronization

## Usage Examples

### Basic Audio Upload

```typescript
import { audioStorageService } from '../services/audioStorageService';

// Upload lesson audio
const result = await audioStorageService.uploadLessonAudio(
  audioBuffer,
  'lesson-123',
  'course-456',
  {
    quality: 'high',
    metadata: {
      duration: 300,
      language: 'en',
      subject: 'spanish'
    }
  }
);

if (result.data) {
  console.log('Upload successful:', result.data.url);
}
```

### Smart Preloading

```typescript
import StorageManager from '../utils/storageManager';

// Preload lessons based on user progress
const preloadResult = await StorageManager.smartPreload(userId);
console.log(`Preloaded ${preloadResult.data.preloadedLessons} lessons`);
```

### Storage Optimization

```typescript
// Optimize storage across all systems
const optimizeResult = await StorageManager.optimizeStorage();
console.log('Optimization results:', optimizeResult.data);
```

### Cache Management

```typescript
import { audioStorageService } from '../services/audioStorageService';

// Get cache statistics
const stats = await audioStorageService.getCacheStats();
console.log('Cache usage:', stats.data);

// Clean up old cached files
const cleaned = await audioStorageService.cleanupCache();
console.log(`Cleaned up ${cleaned.data} files`);
```

## Database Functions

The following PostgreSQL functions are available for advanced storage operations:

### Storage Statistics

```sql
-- Get storage usage statistics
SELECT get_storage_stats('user-id-here');

-- Get audio quality breakdown
SELECT get_audio_stats_by_quality('lesson-audio');

-- Get CDN cache performance
SELECT get_cdn_cache_stats('lesson-audio');
```

### Maintenance Operations

```sql
-- Cleanup old files (older than 30 days)
SELECT cleanup_old_storage_files('lesson-audio', 30);

-- Remove duplicate files
SELECT cleanup_duplicate_audio_files('lesson-audio');

-- Update file metadata
SELECT update_audio_metadata('lesson-audio', 'path/to/file.mp3', '{"quality": "high"}');
```

## Storage Policies

### Row Level Security (RLS)

All storage buckets have RLS enabled with the following policies:

#### lesson-audio bucket:
- **Public read access** for all lesson audio files
- **Authenticated upload** for content generation
- **Authenticated update/delete** for file management

#### user-uploads bucket:
- **Private access** - users can only access their own files
- **Folder-based isolation** using user ID as folder name
- **Authenticated CRUD operations** within user's folder

## Monitoring and Alerts

### Storage Health Monitoring

```typescript
// Check storage system health
const health = await StorageManager.healthCheck();
console.log('Storage health:', health.data);

// Monitor usage and get alerts
const monitoring = await StorageManager.monitorStorageUsage();
monitoring.data.alerts.forEach(alert => {
  console.log(`${alert.level}: ${alert.message}`);
});
```

### Storage Recommendations

```typescript
// Get personalized storage recommendations
const recommendations = await StorageManager.getStorageRecommendations(userId);
console.log('Recommendations:', recommendations.data.recommendations);
console.log('Suggested actions:', recommendations.data.actions);
```

## Testing

Run the storage test suite to verify your setup:

```bash
# Run storage tests
npx ts-node scripts/testStorage.ts
```

The test script will:
1. ✅ Check configuration
2. ✅ Run health checks
3. ✅ Test upload/download operations
4. ✅ Verify metadata handling
5. ✅ Test optimization features
6. ✅ Check monitoring systems

## Performance Considerations

### Upload Optimization
- Files are uploaded with optimized metadata
- Compression is applied automatically
- CDN cache headers are set for global delivery

### Download Optimization
- Smart caching reduces redundant downloads
- Progressive loading for large files
- Offline-first approach for cached content

### Storage Efficiency
- Automatic duplicate detection and removal
- Intelligent cache management
- Usage-based cleanup policies

## Security Features

### Access Control
- JWT-based authentication for all operations
- User-specific folder isolation
- Role-based access control

### Data Protection
- Encrypted data transmission (HTTPS)
- Secure API key management
- Audit logging for all operations

### Privacy Compliance
- User data isolation
- Configurable retention policies
- GDPR-compliant data handling

## Troubleshooting

### Common Issues

1. **Upload Failures**
   - Check file size limits (50MB for lesson-audio, 10MB for user-uploads)
   - Verify supported formats (MP3, WAV, OGG)
   - Ensure proper authentication

2. **Download Issues**
   - Check network connectivity
   - Verify file exists in storage
   - Check cache space availability

3. **Cache Problems**
   - Monitor cache usage with `getCacheStats()`
   - Run cleanup if storage is full
   - Check file permissions

### Debug Mode

Enable debug logging by setting:

```typescript
// In development
if (__DEV__) {
  console.log('Storage debug info enabled');
}
```

## Migration Notes

When migrating from basic storage to this enhanced setup:

1. **Database Migration**: Run the storage setup migrations
2. **Environment Variables**: Update your `.env` file with S3 credentials
3. **Code Updates**: Replace basic storage calls with new service methods
4. **Testing**: Run the test suite to verify functionality

## Future Enhancements

Planned improvements for future releases:

- [ ] **Multi-region Replication**: Automatic content replication across regions
- [ ] **Advanced Analytics**: Detailed usage analytics and insights
- [ ] **AI-powered Optimization**: Machine learning for cache prediction
- [ ] **Real-time Sync**: WebSocket-based real-time synchronization
- [ ] **Advanced Compression**: Dynamic quality adjustment based on network

## Support

For storage-related issues:

1. Check the troubleshooting section above
2. Run the test script to identify specific problems
3. Review the storage health monitoring output
4. Check environment variable configuration

## API Reference

### StorageManager

Main orchestration class for all storage operations.

#### Methods

- `initialize()` - Initialize storage system
- `getStorageOverview()` - Get comprehensive storage statistics
- `optimizeStorage()` - Optimize storage across all systems
- `uploadAudioWithRedundancy()` - Upload with backup strategies
- `smartPreload()` - Intelligent lesson preloading
- `healthCheck()` - System health verification
- `syncCachedContent()` - Sync offline content
- `getStorageRecommendations()` - Personalized recommendations
- `monitorStorageUsage()` - Usage monitoring and alerts

### AudioStorageService

Specialized service for audio file management.

#### Methods

- `uploadLessonAudio()` - Upload lesson audio with metadata
- `downloadAndCacheAudio()` - Download and cache for offline use
- `getCachedAudioPath()` - Get local cached file path
- `preloadLessons()` - Preload multiple lessons
- `deleteCachedAudio()` - Remove cached audio file
- `getCacheStats()` - Get cache usage statistics
- `cleanupCache()` - Clean up old cached files
- `isAudioCached()` - Check if audio is cached
- `getAudioUrl()` - Get audio URL (cached or remote)
- `syncCachedFiles()` - Sync cached files with remote

### StorageService

Direct S3 integration service.

#### Methods

- `uploadAudio()` - Direct S3 upload
- `downloadAudio()` - Direct S3 download
- `getAudioUrl()` - Get public URL
- `deleteAudio()` - Delete from S3
- `listFiles()` - List bucket contents
- `getFileMetadata()` - Get file metadata
- `generatePresignedUrl()` - Generate temporary access URL
- `batchUpload()` - Upload multiple files
- `isConfigured()` - Check configuration status
- `getConfig()` - Get configuration info

---

**Task 2.3 Implementation Status: ✅ COMPLETE**

All requirements have been implemented:
- ✅ Configure lesson-audio storage bucket with proper permissions
- ✅ Implement audio upload and retrieval methods
- ✅ Set up CDN configuration for global audio delivery
- ✅ Enhanced with advanced features and monitoring
- ✅ Comprehensive testing and documentation