-- Migration: Pre-Generated Content Tables
-- Description: Create tables for pre-generated courses and lessons for free users

-- Pre-generated courses table
CREATE TABLE IF NOT EXISTS pre_generated_courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    total_lessons INTEGER NOT NULL CHECK (total_lessons > 0),
    estimated_duration INTEGER NOT NULL CHECK (estimated_duration > 0), -- total minutes
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    commute_time INTEGER NOT NULL CHECK (commute_time > 0), -- target commute time in minutes
    is_premium BOOLEAN NOT NULL DEFAULT false,
    description TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pre-generated lessons table
CREATE TABLE IF NOT EXISTS pre_generated_lessons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES pre_generated_courses(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    duration INTEGER NOT NULL CHECK (duration > 0), -- minutes
    transcript TEXT NOT NULL,
    lesson_order INTEGER NOT NULL CHECK (lesson_order > 0),
    topic VARCHAR(200) NOT NULL,
    objectives TEXT[] NOT NULL DEFAULT '{}',
    key_concepts TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(course_id, lesson_order)
);

-- Pre-generated lesson interactions table
CREATE TABLE IF NOT EXISTS pre_generated_lesson_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID NOT NULL REFERENCES pre_generated_lessons(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('quiz', 'reflection', 'practice')),
    prompt TEXT NOT NULL,
    options TEXT[], -- JSON array for quiz options
    correct_answer TEXT, -- For quiz type
    interaction_order INTEGER NOT NULL CHECK (interaction_order > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(lesson_id, interaction_order)
);

-- Add pre_generated_course_id to existing courses table for linking
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS pre_generated_course_id UUID REFERENCES pre_generated_courses(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pre_generated_courses_subject_id ON pre_generated_courses(subject_id);
CREATE INDEX IF NOT EXISTS idx_pre_generated_courses_commute_time ON pre_generated_courses(commute_time);
CREATE INDEX IF NOT EXISTS idx_pre_generated_courses_difficulty ON pre_generated_courses(difficulty);
CREATE INDEX IF NOT EXISTS idx_pre_generated_courses_tags ON pre_generated_courses USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_pre_generated_lessons_course_id ON pre_generated_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_pre_generated_lessons_order ON pre_generated_lessons(course_id, lesson_order);

CREATE INDEX IF NOT EXISTS idx_pre_generated_interactions_lesson_id ON pre_generated_lesson_interactions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_pre_generated_interactions_order ON pre_generated_lesson_interactions(lesson_id, interaction_order);

CREATE INDEX IF NOT EXISTS idx_courses_pre_generated_id ON courses(pre_generated_course_id);

-- RLS (Row Level Security) policies
ALTER TABLE pre_generated_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_generated_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_generated_lesson_interactions ENABLE ROW LEVEL SECURITY;

-- Pre-generated content is readable by all authenticated users
CREATE POLICY "Pre-generated courses are readable by all authenticated users" 
ON pre_generated_courses FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Pre-generated lessons are readable by all authenticated users" 
ON pre_generated_lessons FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Pre-generated interactions are readable by all authenticated users" 
ON pre_generated_lesson_interactions FOR SELECT 
TO authenticated 
USING (true);

-- Only service role can insert/update/delete pre-generated content
CREATE POLICY "Only service role can manage pre-generated courses" 
ON pre_generated_courses FOR ALL 
TO service_role 
USING (true);

CREATE POLICY "Only service role can manage pre-generated lessons" 
ON pre_generated_lessons FOR ALL 
TO service_role 
USING (true);

CREATE POLICY "Only service role can manage pre-generated interactions" 
ON pre_generated_lesson_interactions FOR ALL 
TO service_role 
USING (true);

-- Function to get pre-generated courses by filters
CREATE OR REPLACE FUNCTION get_pre_generated_courses(
    p_subject_id UUID DEFAULT NULL,
    p_commute_time INTEGER DEFAULT NULL,
    p_difficulty TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    subject_id UUID,
    total_lessons INTEGER,
    estimated_duration INTEGER,
    difficulty VARCHAR,
    commute_time INTEGER,
    is_premium BOOLEAN,
    description TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE,
    subject_name VARCHAR,
    subject_category VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pgc.id,
        pgc.title,
        pgc.subject_id,
        pgc.total_lessons,
        pgc.estimated_duration,
        pgc.difficulty,
        pgc.commute_time,
        pgc.is_premium,
        pgc.description,
        pgc.tags,
        pgc.created_at,
        s.name as subject_name,
        s.category as subject_category
    FROM pre_generated_courses pgc
    JOIN subjects s ON pgc.subject_id = s.id
    WHERE 
        (p_subject_id IS NULL OR pgc.subject_id = p_subject_id)
        AND (p_commute_time IS NULL OR pgc.commute_time = p_commute_time)
        AND (p_difficulty IS NULL OR pgc.difficulty = p_difficulty)
    ORDER BY pgc.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Function to get course statistics
CREATE OR REPLACE FUNCTION get_pre_generated_course_stats()
RETURNS TABLE (
    total_courses BIGINT,
    courses_by_difficulty JSONB,
    courses_by_commute_time JSONB,
    popular_subjects JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM pre_generated_courses) as total_courses,
        (
            SELECT jsonb_object_agg(difficulty, count)
            FROM (
                SELECT difficulty, COUNT(*) as count
                FROM pre_generated_courses
                GROUP BY difficulty
            ) t
        ) as courses_by_difficulty,
        (
            SELECT jsonb_object_agg(commute_time::text, count)
            FROM (
                SELECT commute_time, COUNT(*) as count
                FROM pre_generated_courses
                GROUP BY commute_time
                ORDER BY commute_time
            ) t
        ) as courses_by_commute_time,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'subject_name', s.name,
                    'course_count', t.count
                )
            )
            FROM (
                SELECT subject_id, COUNT(*) as count
                FROM pre_generated_courses
                GROUP BY subject_id
                ORDER BY count DESC
                LIMIT 10
            ) t
            JOIN subjects s ON t.subject_id = s.id
        ) as popular_subjects;
END;
$$;

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pre_generated_courses_updated_at 
    BEFORE UPDATE ON pre_generated_courses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pre_generated_lessons_updated_at 
    BEFORE UPDATE ON pre_generated_lessons 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();