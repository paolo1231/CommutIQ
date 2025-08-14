-- CommutIQ Database Schema
-- Version: 1.0
-- Description: Initial database schema with all core tables, storage, and functions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User profiles table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    commute_time INTEGER NOT NULL DEFAULT 30,
    subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
    preferences JSONB NOT NULL DEFAULT '{}',
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subjects table
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT NOT NULL,
    color JSONB NOT NULL,
    category TEXT NOT NULL,
    is_premium BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User subjects junction table
CREATE TABLE user_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, subject_id)
);

-- Courses table
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    total_lessons INTEGER NOT NULL DEFAULT 0,
    estimated_duration INTEGER NOT NULL DEFAULT 0, -- in minutes
    difficulty TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    tags TEXT[] DEFAULT '{}',
    is_premium BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lessons table
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    transcript TEXT,
    audio_url TEXT,
    duration INTEGER NOT NULL DEFAULT 0, -- in minutes
    lesson_order INTEGER NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, lesson_order)
);

-- User progress table
CREATE TABLE user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    progress_percentage DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    completed_at TIMESTAMPTZ,
    last_position_seconds INTEGER DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0, -- in seconds
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

-- Lesson interactions table
CREATE TABLE lesson_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('quiz', 'reflection', 'discussion')),
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    position_seconds INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User interaction responses table
CREATE TABLE user_interaction_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    interaction_id UUID NOT NULL REFERENCES lesson_interactions(id) ON DELETE CASCADE,
    response JSONB NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    score DECIMAL(5,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, interaction_id)
);

-- Analytics events table (for future use)
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    session_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync queue table for offline support
CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    data JSONB,
    synced BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ
);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('lesson-audio', 'lesson-audio', false),
    ('user-uploads', 'user-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for lesson-audio bucket
CREATE POLICY "Users can view lesson audio" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'lesson-audio');

CREATE POLICY "Service role can manage lesson audio" 
ON storage.objects FOR ALL 
USING (bucket_id = 'lesson-audio' AND auth.role() = 'service_role');

-- Storage policies for user-uploads bucket
CREATE POLICY "Users can view their uploads" 
ON storage.objects FOR SELECT 
USING (
    bucket_id = 'user-uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their files" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'user-uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their uploads" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'user-uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their uploads" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'user-uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Row Level Security policies

-- User profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
ON user_profiles FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON user_profiles FOR UPDATE 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON user_profiles FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- Subjects (public read)
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view subjects" 
ON subjects FOR SELECT 
USING (true);

-- User subjects
ALTER TABLE user_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subjects" 
ON user_subjects FOR ALL 
USING (auth.uid() = user_id);

-- Courses
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own courses" 
ON courses FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create courses" 
ON courses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own courses" 
ON courses FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own courses" 
ON courses FOR DELETE 
USING (auth.uid() = user_id);

-- Lessons
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lessons for their courses" 
ON lessons FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM courses 
        WHERE courses.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create lessons for their courses" 
ON lessons FOR INSERT 
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM courses 
        WHERE courses.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update lessons for their courses" 
ON lessons FOR UPDATE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM courses 
        WHERE courses.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete lessons for their courses" 
ON lessons FOR DELETE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM courses 
        WHERE courses.user_id = auth.uid()
    )
);

-- User progress
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own progress" 
ON user_progress FOR ALL 
USING (auth.uid() = user_id);

-- Lesson interactions
ALTER TABLE lesson_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view interactions for their lessons" 
ON lesson_interactions FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM courses 
        WHERE courses.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert interactions for their lessons" 
ON lesson_interactions FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM courses 
        WHERE courses.user_id = auth.uid()
    )
);

-- User interaction responses
ALTER TABLE user_interaction_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own responses" 
ON user_interaction_responses FOR ALL 
USING (auth.uid() = user_id);

-- Analytics events
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own analytics" 
ON analytics_events FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Sync queue
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sync queue" 
ON sync_queue FOR ALL 
USING (auth.uid() = user_id);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at 
    BEFORE UPDATE ON subjects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at 
    BEFORE UPDATE ON courses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at 
    BEFORE UPDATE ON lessons 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at 
    BEFORE UPDATE ON user_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_interactions_updated_at 
    BEFORE UPDATE ON lesson_interactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_interaction_responses_updated_at 
    BEFORE UPDATE ON user_interaction_responses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_user_subjects_user_id ON user_subjects(user_id);
CREATE INDEX idx_user_subjects_priority ON user_subjects(user_id, priority);
CREATE INDEX idx_courses_user_id ON courses(user_id);
CREATE INDEX idx_courses_subject_id ON courses(subject_id);
CREATE INDEX idx_lessons_course_id ON lessons(course_id);
CREATE INDEX idx_lessons_order ON lessons(course_id, lesson_order);
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_lesson_id ON user_progress(lesson_id);
CREATE INDEX idx_user_progress_completed ON user_progress(user_id, completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_lesson_interactions_lesson_id ON lesson_interactions(lesson_id);
CREATE INDEX idx_user_interaction_responses_user_id ON user_interaction_responses(user_id);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX idx_sync_queue_user_id ON sync_queue(user_id);
CREATE INDEX idx_sync_queue_unsynced ON sync_queue(user_id, synced) WHERE NOT synced;

-- Helper functions
CREATE OR REPLACE FUNCTION get_user_course_progress(user_uuid UUID, course_uuid UUID)
RETURNS TABLE (
    total_lessons INTEGER,
    completed_lessons INTEGER,
    progress_percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_lessons,
        COUNT(CASE WHEN up.completed_at IS NOT NULL THEN 1 END)::INTEGER as completed_lessons,
        ROUND(
            (COUNT(CASE WHEN up.completed_at IS NOT NULL THEN 1 END)::DECIMAL / 
             NULLIF(COUNT(*)::DECIMAL, 0)) * 100, 2
        ) as progress_percentage
    FROM lessons l
    LEFT JOIN user_progress up ON l.id = up.lesson_id AND up.user_id = user_uuid
    WHERE l.course_id = course_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get storage statistics
CREATE OR REPLACE FUNCTION get_storage_stats(user_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_files', COUNT(*),
        'total_size_bytes', COALESCE(SUM((metadata->>'size')::bigint), 0),
        'by_bucket', json_agg(
            json_build_object(
                'bucket_id', bucket_id,
                'file_count', bucket_count,
                'total_size', bucket_size
            )
        )
    ) INTO result
    FROM (
        SELECT 
            bucket_id,
            COUNT(*) as bucket_count,
            COALESCE(SUM((metadata->>'size')::bigint), 0) as bucket_size
        FROM storage.objects 
        WHERE (user_id IS NULL OR 
               (bucket_id = 'user-uploads' AND (storage.foldername(name))[1] = user_id::text))
        GROUP BY bucket_id
    ) bucket_stats;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old storage files
CREATE OR REPLACE FUNCTION cleanup_old_storage_files(
    bucket_name TEXT,
    older_than_days INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted_files AS (
        DELETE FROM storage.objects 
        WHERE bucket_id = bucket_name 
        AND created_at < NOW() - INTERVAL '1 day' * older_than_days
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted_files;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, commute_time, subscription_tier, preferences)
    VALUES (
        NEW.id,
        30, -- default commute time
        'free', -- default subscription tier
        jsonb_build_object(
            'audioSpeed', 1.0,
            'autoPlay', true,
            'downloadQuality', 'standard',
            'notificationsEnabled', true,
            'backgroundPlayback', true
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
