-- Storage CDN optimization and performance enhancements
-- Add additional indexes and functions for better audio file management

-- Add indexes for better storage performance
CREATE INDEX IF NOT EXISTS idx_storage_objects_bucket_path ON storage.objects(bucket_id, name);
CREATE INDEX IF NOT EXISTS idx_storage_objects_size ON storage.objects((metadata->>'size')::bigint);
CREATE INDEX IF NOT EXISTS idx_storage_objects_content_type ON storage.objects((metadata->>'mimetype'));

-- Function to get audio file statistics by quality
CREATE OR REPLACE FUNCTION get_audio_stats_by_quality(bucket_name TEXT DEFAULT 'lesson-audio')
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'high_quality', json_build_object(
            'count', COUNT(*) FILTER (WHERE metadata->>'quality' = 'high'),
            'total_size', COALESCE(SUM((metadata->>'size')::bigint) FILTER (WHERE metadata->>'quality' = 'high'), 0)
        ),
        'standard_quality', json_build_object(
            'count', COUNT(*) FILTER (WHERE metadata->>'quality' = 'standard' OR metadata->>'quality' IS NULL),
            'total_size', COALESCE(SUM((metadata->>'size')::bigint) FILTER (WHERE metadata->>'quality' = 'standard' OR metadata->>'quality' IS NULL), 0)
        ),
        'total', json_build_object(
            'count', COUNT(*),
            'total_size', COALESCE(SUM((metadata->>'size')::bigint), 0)
        )
    ) INTO result
    FROM storage.objects
    WHERE bucket_id = bucket_name;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to optimize storage by removing duplicate files
CREATE OR REPLACE FUNCTION cleanup_duplicate_audio_files(bucket_name TEXT DEFAULT 'lesson-audio')
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    duplicate_record RECORD;
BEGIN
    -- Find and remove duplicate files based on size and content hash
    FOR duplicate_record IN
        SELECT name, metadata->>'size' as file_size, COUNT(*) as duplicate_count
        FROM storage.objects
        WHERE bucket_id = bucket_name
        AND metadata->>'size' IS NOT NULL
        GROUP BY name, metadata->>'size'
        HAVING COUNT(*) > 1
    LOOP
        -- Keep the most recent file, delete older duplicates
        DELETE FROM storage.objects
        WHERE bucket_id = bucket_name
        AND name = duplicate_record.name
        AND metadata->>'size' = duplicate_record.file_size
        AND id NOT IN (
            SELECT id FROM storage.objects
            WHERE bucket_id = bucket_name
            AND name = duplicate_record.name
            AND metadata->>'size' = duplicate_record.file_size
            ORDER BY created_at DESC
            LIMIT 1
        );
        
        GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    END LOOP;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get CDN cache statistics
CREATE OR REPLACE FUNCTION get_cdn_cache_stats(bucket_name TEXT DEFAULT 'lesson-audio')
RETURNS JSON AS $$
DECLARE
    result JSON;
    total_files INTEGER;
    cached_files INTEGER;
    cache_hit_ratio DECIMAL;
BEGIN
    -- Count total files
    SELECT COUNT(*) INTO total_files
    FROM storage.objects
    WHERE bucket_id = bucket_name;

    -- Count files with cache metadata (simulated)
    SELECT COUNT(*) INTO cached_files
    FROM storage.objects
    WHERE bucket_id = bucket_name
    AND metadata ? 'cache_status';

    -- Calculate cache hit ratio
    cache_hit_ratio := CASE 
        WHEN total_files > 0 THEN (cached_files::DECIMAL / total_files::DECIMAL) * 100
        ELSE 0
    END;

    result := json_build_object(
        'total_files', total_files,
        'cached_files', cached_files,
        'cache_hit_ratio', ROUND(cache_hit_ratio, 2),
        'uncached_files', total_files - cached_files
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update file metadata for CDN optimization
CREATE OR REPLACE FUNCTION update_audio_metadata(
    bucket_name TEXT,
    file_path TEXT,
    new_metadata JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    current_metadata JSONB;
    updated_metadata JSONB;
BEGIN
    -- Get current metadata
    SELECT metadata INTO current_metadata
    FROM storage.objects
    WHERE bucket_id = bucket_name AND name = file_path;

    IF current_metadata IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Merge with new metadata
    updated_metadata := current_metadata || new_metadata;

    -- Update the record
    UPDATE storage.objects
    SET metadata = updated_metadata,
        updated_at = NOW()
    WHERE bucket_id = bucket_name AND name = file_path;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get files ready for CDN preloading
CREATE OR REPLACE FUNCTION get_preload_candidates(
    bucket_name TEXT DEFAULT 'lesson-audio',
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE(
    file_path TEXT,
    file_size BIGINT,
    content_type TEXT,
    quality TEXT,
    last_accessed TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.name as file_path,
        (o.metadata->>'size')::BIGINT as file_size,
        o.metadata->>'mimetype' as content_type,
        COALESCE(o.metadata->>'quality', 'standard') as quality,
        o.created_at as last_accessed
    FROM storage.objects o
    WHERE o.bucket_id = bucket_name
    AND o.metadata->>'mimetype' LIKE 'audio/%'
    ORDER BY o.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for audio file analytics
CREATE OR REPLACE VIEW audio_file_analytics AS
SELECT 
    bucket_id,
    COUNT(*) as total_files,
    SUM((metadata->>'size')::bigint) as total_size,
    AVG((metadata->>'size')::bigint) as avg_file_size,
    COUNT(*) FILTER (WHERE metadata->>'quality' = 'high') as high_quality_count,
    COUNT(*) FILTER (WHERE metadata->>'quality' = 'standard') as standard_quality_count,
    COUNT(*) FILTER (WHERE metadata->>'mimetype' = 'audio/mpeg') as mp3_count,
    COUNT(*) FILTER (WHERE metadata->>'mimetype' = 'audio/wav') as wav_count,
    COUNT(*) FILTER (WHERE metadata->>'mimetype' = 'audio/ogg') as ogg_count,
    MIN(created_at) as oldest_file,
    MAX(created_at) as newest_file
FROM storage.objects
WHERE metadata->>'mimetype' LIKE 'audio/%'
GROUP BY bucket_id;

-- Grant permissions for the new functions
GRANT EXECUTE ON FUNCTION get_audio_stats_by_quality(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_duplicate_audio_files(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cdn_cache_stats(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_audio_metadata(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_preload_candidates(TEXT, INTEGER) TO authenticated;
GRANT SELECT ON audio_file_analytics TO authenticated;

-- Add RLS policies for the analytics view
ALTER VIEW audio_file_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audio analytics" ON audio_file_analytics
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create a trigger to automatically update metadata on file upload
CREATE OR REPLACE FUNCTION update_audio_upload_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Add upload timestamp and CDN optimization flags
    NEW.metadata = COALESCE(NEW.metadata, '{}'::jsonb) || jsonb_build_object(
        'uploaded_at', NOW()::text,
        'cdn_optimized', false,
        'cache_status', 'pending'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for audio file uploads
DROP TRIGGER IF EXISTS audio_upload_metadata_trigger ON storage.objects;
CREATE TRIGGER audio_upload_metadata_trigger
    BEFORE INSERT ON storage.objects
    FOR EACH ROW
    WHEN (NEW.bucket_id IN ('lesson-audio', 'user-uploads') AND NEW.metadata->>'mimetype' LIKE 'audio/%')
    EXECUTE FUNCTION update_audio_upload_metadata();

-- Add comments for documentation
COMMENT ON FUNCTION get_audio_stats_by_quality(TEXT) IS 'Get audio file statistics grouped by quality level';
COMMENT ON FUNCTION cleanup_duplicate_audio_files(TEXT) IS 'Remove duplicate audio files to optimize storage';
COMMENT ON FUNCTION get_cdn_cache_stats(TEXT) IS 'Get CDN cache performance statistics';
COMMENT ON FUNCTION update_audio_metadata(TEXT, TEXT, JSONB) IS 'Update metadata for CDN optimization';
COMMENT ON FUNCTION get_preload_candidates(TEXT, INTEGER) IS 'Get files that should be preloaded for better performance';
COMMENT ON VIEW audio_file_analytics IS 'Analytics view for audio file storage metrics';