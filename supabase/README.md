# CommuteIQ Supabase Setup

This directory contains the Supabase configuration and database schema for the CommuteIQ application.

## Database Schema

The database includes the following tables:

### Core Tables
- `user_profiles` - Extended user information beyond Supabase Auth
- `subjects` - Available learning subjects and categories
- `user_subjects` - User's selected subjects with priorities
- `courses` - AI-generated courses for users
- `lessons` - Individual lessons within courses
- `user_progress` - Progress tracking for lessons
- `lesson_interactions` - Interactive elements within lessons
- `user_interaction_responses` - User responses to interactions

### Sync Tables
- `user_devices` - Device registration for cross-device sync
- `sync_state` - Synchronization state management

## Security

All tables have Row Level Security (RLS) enabled with appropriate policies:
- Users can only access their own data
- Subjects are publicly readable
- Course and lesson access is restricted to owners
- Progress tracking is user-specific

## Indexes

Optimized indexes are created for:
- User-specific queries
- Course and lesson lookups
- Progress tracking queries
- Cross-device synchronization

## Setup Instructions

1. Install Supabase CLI: `npm install -g supabase`
2. Initialize project: `supabase init`
3. Start local development: `supabase start`
4. Apply migrations: `supabase db reset`
5. Seed data: `supabase db seed`

## Environment Variables

Required environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations

## Storage Buckets

The following storage buckets are automatically configured:

### lesson-audio
- **Purpose**: Store AI-generated lesson audio files
- **Access**: Public read access
- **Size Limit**: 50MB per file
- **Allowed Types**: MP3, WAV, OGG
- **CDN**: Automatically distributed via Supabase CDN

### user-uploads  
- **Purpose**: Store user-generated audio content
- **Access**: Private (user-specific access)
- **Size Limit**: 10MB per file
- **Allowed Types**: MP3, WAV, OGG

## Storage Policies

Row Level Security policies ensure:
- Public read access to lesson audio files
- Users can only access their own uploaded files
- Authenticated users can upload lesson audio
- Folder-based isolation for user uploads

## Edge Functions

### process-audio
- Handles audio file processing and optimization
- Uploads processed audio to appropriate storage bucket
- Updates lesson records with audio URLs
- Provides error handling and validation

## Storage Management

The StorageService class provides:
- Audio file upload/download operations
- Signed URL generation for private files
- Storage usage statistics and monitoring
- Automatic cleanup of old files
- File validation and format checking