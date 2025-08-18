-- TTS Cache Optimization
-- Version: 1.0
-- Description: Creates TTS cache bucket and optimizes audio storage

-- Create TTS cache bucket for caching generated audio
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'tts-cache',
    'tts-cache',
    false,
    52428800, -- 50MB limit per file
    ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for TTS cache bucket
CREATE POLICY "Service role can manage TTS cache" 
ON storage.objects FOR ALL 
USING (bucket_id = 'tts-cache' AND auth.role() = 'service_role');

-- Create table to track TTS cache metadata
CREATE TABLE IF NOT EXISTS tts_cache_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key TEXT NOT NULL UNIQUE,
    text_hash TEXT NOT NULL,
    voice TEXT NOT NULL,
    speed DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    format TEXT NOT NULL DEFAULT 'mp3',
    quality TEXT NOT NULL DEFAULT 'standard',
    file_size INTEGER NOT NULL,
    hit_count INTEGER NOT NULL DEFAULT 0,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);

-- Create indexes for efficient cache lookups
CREATE INDEX idx_tts_cache_key ON tts_cache_metadata(cache_key);
CREATE INDEX idx_tts_cache_expires ON tts_cache_metadata(expires_at);
CREATE INDEX idx_tts_cache_last_accessed ON tts_cache_metadata(last_accessed_at);

-- Function to clean up expired TTS cache
CREATE OR REPLACE FUNCTION clean_expired_tts_cache()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER := 0;
    cache_record RECORD;
BEGIN
    -- Find expired cache entries
    FOR cache_record IN 
        SELECT cache_key, id 
        FROM tts_cache_metadata 
        WHERE expires_at < NOW()
    LOOP
        -- Delete from storage
        DELETE FROM storage.objects 
        WHERE bucket_id = 'tts-cache' 
        AND name = cache_record.cache_key;
        
        -- Delete metadata
        DELETE FROM tts_cache_metadata 
        WHERE id = cache_record.id;
        
        deleted_count := deleted_count + 1;
    END LOOP;
    
    RETURN deleted_count;
END;
$$;

-- Function to update cache hit statistics
CREATE OR REPLACE FUNCTION update_tts_cache_hit(p_cache_key TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE tts_cache_metadata
    SET 
        hit_count = hit_count + 1,
        last_accessed_at = NOW(),
        -- Extend expiration for frequently accessed content
        expires_at = CASE 
            WHEN hit_count > 10 THEN NOW() + INTERVAL '30 days'
            WHEN hit_count > 5 THEN NOW() + INTERVAL '14 days'
            ELSE NOW() + INTERVAL '7 days'
        END
    WHERE cache_key = p_cache_key;
END;
$$;

-- Create a scheduled job to clean up expired cache (requires pg_cron extension)
-- Note: This is optional and requires pg_cron to be enabled
-- SELECT cron.schedule('clean-tts-cache', '0 3 * * *', 'SELECT clean_expired_tts_cache();');

-- Add column to track TTS generation time for performance monitoring
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS tts_generation_time_ms INTEGER;
ALTER TABLE pre_generated_lessons ADD COLUMN IF NOT EXISTS tts_generation_time_ms INTEGER;

-- Create view for TTS performance analytics
CREATE OR REPLACE VIEW tts_performance_stats AS
SELECT 
    COUNT(*) as total_cached_files,
    SUM(file_size) / 1024 / 1024 as total_cache_size_mb,
    AVG(hit_count) as avg_hit_count,
    MAX(hit_count) as max_hit_count,
    COUNT(CASE WHEN quality = 'high' THEN 1 END) as high_quality_count,
    COUNT(CASE WHEN quality = 'standard' THEN 1 END) as standard_quality_count,
    AVG(CASE WHEN hit_count > 0 THEN file_size::FLOAT / hit_count ELSE 0 END) / 1024 as avg_kb_per_hit
FROM tts_cache_metadata
WHERE expires_at > NOW();

-- Grant permissions
GRANT SELECT ON tts_performance_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE ON tts_cache_metadata TO service_role;

-- Add comments
COMMENT ON TABLE tts_cache_metadata IS 'Tracks metadata for cached TTS audio files to optimize performance';
COMMENT ON FUNCTION clean_expired_tts_cache IS 'Removes expired TTS cache entries from both storage and metadata';
COMMENT ON FUNCTION update_tts_cache_hit IS 'Updates cache hit statistics and extends expiration for popular content';
COMMENT ON VIEW tts_performance_stats IS 'Provides analytics on TTS cache performance and usage';
