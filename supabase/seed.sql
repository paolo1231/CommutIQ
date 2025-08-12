-- CommutIQ Seed Data
-- Version: 1.0
-- Description: Initial seed data for subjects and sample content

-- Insert default subjects
INSERT INTO subjects (name, icon, color, category, is_premium) VALUES
-- Core academic subjects
('Mathematics', 'calculator', '{"primary": "#2563EB", "secondary": "#DBEAFE"}', 'academic', false),
('Science', 'flask', '{"primary": "#DC2626", "secondary": "#FEE2E2"}', 'academic', false),
('History', 'book-open', '{"primary": "#7C2D12", "secondary": "#FED7AA"}', 'academic', false),
('Literature', 'feather', '{"primary": "#7C3AED", "secondary": "#E9D5FF"}', 'academic', false),
('Geography', 'globe', '{"primary": "#059669", "secondary": "#D1FAE5"}', 'academic', false),

-- Language subjects
('English', 'message-circle', '{"primary": "#1D4ED8", "secondary": "#DBEAFE"}', 'language', false),
('Spanish', 'message-circle', '{"primary": "#DC2626", "secondary": "#FEE2E2"}', 'language', false),
('French', 'message-circle', '{"primary": "#2563EB", "secondary": "#DBEAFE"}', 'language', false),
('German', 'message-circle', '{"primary": "#1F2937", "secondary": "#F3F4F6"}', 'language', false),
('Mandarin', 'message-circle', '{"primary": "#DC2626", "secondary": "#FEE2E2"}', 'language', true),

-- Technology subjects
('Programming', 'code', '{"primary": "#059669", "secondary": "#D1FAE5"}', 'technology', false),
('Web Development', 'monitor', '{"primary": "#7C3AED", "secondary": "#E9D5FF"}', 'technology', false),
('Data Science', 'bar-chart', '{"primary": "#0891B2", "secondary": "#CFFAFE"}', 'technology', true),
('Cybersecurity', 'shield', '{"primary": "#DC2626", "secondary": "#FEE2E2"}', 'technology', true),
('AI & Machine Learning', 'cpu', '{"primary": "#7C2D12", "secondary": "#FED7AA"}', 'technology', true),

-- Business subjects
('Business Management', 'briefcase', '{"primary": "#1D4ED8", "secondary": "#DBEAFE"}', 'business', false),
('Marketing', 'trending-up', '{"primary": "#DC2626", "secondary": "#FEE2E2"}', 'business', false),
('Finance', 'dollar-sign', '{"primary": "#059669", "secondary": "#D1FAE5"}', 'business', false),
('Entrepreneurship', 'lightbulb', '{"primary": "#F59E0B", "secondary": "#FEF3C7"}', 'business', true),
('Economics', 'pie-chart', '{"primary": "#7C3AED", "secondary": "#E9D5FF"}', 'business', false),

-- Personal development subjects
('Leadership', 'users', '{"primary": "#1D4ED8", "secondary": "#DBEAFE"}', 'personal', true),
('Communication', 'mic', '{"primary": "#059669", "secondary": "#D1FAE5"}', 'personal', false),
('Time Management', 'clock', '{"primary": "#7C2D12", "secondary": "#FED7AA"}', 'personal', false),
('Mindfulness', 'heart', '{"primary": "#7C3AED", "secondary": "#E9D5FF"}', 'personal', true),
('Goal Setting', 'target', '{"primary": "#DC2626", "secondary": "#FEE2E2"}', 'personal', false),

-- Creative subjects
('Creative Writing', 'edit-3', '{"primary": "#7C3AED", "secondary": "#E9D5FF"}', 'creative', false),
('Photography', 'camera', '{"primary": "#1F2937", "secondary": "#F3F4F6"}', 'creative', true),
('Music Theory', 'music', '{"primary": "#7C2D12", "secondary": "#FED7AA"}', 'creative', true),
('Graphic Design', 'palette', '{"primary": "#DC2626", "secondary": "#FEE2E2"}', 'creative', true),
('Video Production', 'video', '{"primary": "#059669", "secondary": "#D1FAE5"}', 'creative', true),

-- Health & wellness subjects
('Nutrition', 'apple', '{"primary": "#059669", "secondary": "#D1FAE5"}', 'health', false),
('Fitness', 'activity', '{"primary": "#DC2626", "secondary": "#FEE2E2"}', 'health', false),
('Mental Health', 'brain', '{"primary": "#7C3AED", "secondary": "#E9D5FF"}', 'health', true),
('Meditation', 'sun', '{"primary": "#F59E0B", "secondary": "#FEF3C7"}', 'health', false),
('Sleep Science', 'moon', '{"primary": "#1D4ED8", "secondary": "#DBEAFE"}', 'health', true)

ON CONFLICT (name) DO UPDATE SET
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    category = EXCLUDED.category,
    is_premium = EXCLUDED.is_premium,
    updated_at = NOW();

-- Create sample user for development (only if in development mode)
-- Note: This would typically be handled by the application during onboarding
-- but is included here for development/testing purposes

DO $$
DECLARE
    sample_user_id UUID;
    programming_subject_id UUID;
    business_subject_id UUID;
    sample_course_id UUID;
BEGIN
    -- Only create sample data if no users exist (development environment)
    IF NOT EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
        
        -- Create sample subjects reference
        SELECT id INTO programming_subject_id FROM subjects WHERE name = 'Programming';
        SELECT id INTO business_subject_id FROM subjects WHERE name = 'Business Management';
        
        -- Note: In a real application, sample users would be created through the auth system
        -- This is a placeholder to show the data structure
        
        RAISE NOTICE 'Sample data structure prepared. Users should be created through the authentication system.';
        
    END IF;
END $$;

-- Insert sample course structure (for development)
-- This demonstrates the expected data structure for courses and lessons
INSERT INTO public.courses (id, title, description, subject_id, user_id, total_lessons, estimated_duration, difficulty, tags, is_premium)
SELECT 
    '00000000-0000-0000-0000-000000000001'::UUID,
    'Introduction to Programming',
    'Learn the fundamentals of programming with practical examples and hands-on exercises.',
    s.id,
    '00000000-0000-0000-0000-000000000001'::UUID, -- Placeholder user ID
    3,
    45,
    'beginner',
    ARRAY['programming', 'basics', 'introduction'],
    false
FROM subjects s 
WHERE s.name = 'Programming'
ON CONFLICT (id) DO NOTHING;

-- Insert sample lessons (for development)
INSERT INTO public.lessons (course_id, title, content, transcript, duration, lesson_order)
VALUES 
(
    '00000000-0000-0000-0000-000000000001'::UUID,
    'What is Programming?',
    'Programming is the process of creating instructions for computers to follow. In this lesson, we will explore the basic concepts of programming and understand how it impacts our daily lives.',
    'Welcome to your first programming lesson. Today we will explore what programming is and why it has become such an important skill in our modern world...',
    15,
    1
),
(
    '00000000-0000-0000-0000-000000000001'::UUID,
    'Programming Languages Overview',
    'There are many different programming languages, each with its own strengths and use cases. We will discuss the most popular languages and when to use them.',
    'In this lesson, we will learn about different programming languages. Just like human languages, programming languages have their own syntax and rules...',
    15,
    2
),
(
    '00000000-0000-0000-0000-000000000001'::UUID,
    'Writing Your First Program',
    'Let''s get hands-on and write your very first program! We will start with a simple "Hello World" example and build from there.',
    'Now it''s time to write our first program together. We will start with the traditional "Hello World" program that every programmer begins with...',
    15,
    3
)
ON CONFLICT (course_id, lesson_order) DO NOTHING;

-- Insert sample lesson interactions
INSERT INTO public.lesson_interactions (lesson_id, type, title, content, position_seconds, is_required)
SELECT 
    l.id,
    'quiz',
    'Quick Check: What is Programming?',
    jsonb_build_object(
        'question', 'What is programming?',
        'options', jsonb_build_array(
            'Writing instructions for computers',
            'Using social media',
            'Sending emails',
            'Playing video games'
        ),
        'correct_answer', 0,
        'explanation', 'Programming is the process of writing instructions that computers can understand and execute.'
    ),
    600, -- 10 minutes into the lesson
    true
FROM lessons l
WHERE l.title = 'What is Programming?'
ON CONFLICT DO NOTHING;

INSERT INTO public.lesson_interactions (lesson_id, type, title, content, position_seconds, is_required)
SELECT 
    l.id,
    'reflection',
    'Reflect: Programming in Daily Life',
    jsonb_build_object(
        'prompt', 'Think about the devices and applications you use daily. How many of them rely on programming?',
        'suggested_duration', 120
    ),
    300, -- 5 minutes into the lesson
    false
FROM lessons l
WHERE l.title = 'What is Programming?'
ON CONFLICT DO NOTHING;

-- Update course lesson counts
UPDATE courses 
SET total_lessons = (
    SELECT COUNT(*) 
    FROM lessons 
    WHERE lessons.course_id = courses.id
),
estimated_duration = (
    SELECT COALESCE(SUM(duration), 0) 
    FROM lessons 
    WHERE lessons.course_id = courses.id
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_subjects_category ON subjects(category);
CREATE INDEX IF NOT EXISTS idx_subjects_premium ON subjects(is_premium);
CREATE INDEX IF NOT EXISTS idx_courses_difficulty ON courses(difficulty);
CREATE INDEX IF NOT EXISTS idx_courses_premium ON courses(is_premium);

-- Insert sample analytics events structure (for development)
-- This shows the expected structure for analytics data
COMMENT ON TABLE analytics_events IS 'Stores user interaction events for analytics. Example event types: lesson_started, lesson_completed, quiz_answered, app_opened, etc.';

-- Insert sample sync queue structure (for development)
-- This shows how offline sync operations are queued
COMMENT ON TABLE sync_queue IS 'Queues database operations for offline sync. Used when the app is offline and needs to sync changes when connectivity is restored.';

-- Performance optimization comments
COMMENT ON INDEX idx_user_progress_completed IS 'Optimizes queries for completed lessons and progress tracking';
COMMENT ON INDEX idx_sync_queue_unsynced IS 'Optimizes queries for pending sync operations';

-- Final status message
DO $$
BEGIN
    RAISE NOTICE 'Seed data installation completed successfully!';
    RAISE NOTICE 'Subjects created: %', (SELECT COUNT(*) FROM subjects);
    RAISE NOTICE 'Sample course structure prepared for development';
END $$;
