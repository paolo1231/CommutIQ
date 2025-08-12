-- Storage setup for CommuteIQ
-- Create buckets and configure policies for audio file management

-- Create lesson-audio bucket for AI-generated lesson audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'lesson-audio',
    'lesson-audio',
    true,
    52428800, -- 50MB limit
    ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
) ON CONFLICT (id) DO NOTHING;

-- Create user-uploads bucket for user-generated audio content
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'user-uploads',
    'user-uploads',
    false,
    10485760, -- 10MB limit
    ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for lesson-audio bucket (public read access)
CREATE POLICY "Public read access for lesson audio" ON storage.objects
    FOR SELECT USING (bucket_id = 'lesson-audio');

CREATE POLICY "Authenticated users can upload lesson audio" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'lesson-audio' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update their lesson audio" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'lesson-audio' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can delete their lesson audio" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'lesson-audio' 
        AND auth.role() = 'authenticated'
    );

-- Storage policies for user-uploads bucket (private access)
CREATE POLICY "Users can view own uploads" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'user-uploads' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can upload to own folder" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'user-uploads' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own uploads" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'user-uploads' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own uploads" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'user-uploads' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_storage_objects_bucket_id ON storage.objects(bucket_id);
CREATE INDEX IF NOT EXISTS idx_storage_objects_name ON storage.objects(name);
CREATE INDEX IF NOT EXISTS idx_storage_objects_created_at ON storage.objects(created_at);

-- Function to get storage usage statistics
CREATE OR REPLACE FUNCTION get_storage_stats(user_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    lesson_audio_stats JSON;
    user_upload_stats JSON;
    result JSON;
BEGIN
    -- Get lesson audio statistics
    SELECT json_build_object(
        'file_count', COUNT(*),
        'total_size', COALESCE(SUM(metadata->>'size')::bigint, 0)
    ) INTO lesson_audio_stats
    FROM storage.objects
    WHERE bucket_id = 'lesson-audio';

    -- Get user upload statistics (if user_id provided)
    IF user_id IS NOT NULL THEN
        SELECT json_build_object(
            'file_count', COUNT(*),
            'total_size', COALESCE(SUM(metadata->>'size')::bigint, 0)
        ) INTO user_upload_stats
        FROM storage.objects
        WHERE bucket_id = 'user-uploads'
        AND name LIKE user_id::text || '/%';
    ELSE
        user_upload_stats := json_build_object('file_count', 0, 'total_size', 0);
    END IF;

    -- Build result
    result := json_build_object(
        'lesson_audio', lesson_audio_stats,
        'user_uploads', user_upload_stats
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old files
CREATE OR REPLACE FUNCTION cleanup_old_storage_files(
    bucket_name TEXT,
    older_than_days INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
    cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
    cutoff_date := NOW() - (older_than_days || ' days')::INTERVAL;
    
    DELETE FROM storage.objects
    WHERE bucket_id = bucket_name
    AND created_at < cutoff_date;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;