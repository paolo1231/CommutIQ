-- Run this script in your Supabase SQL editor to apply the schema fixes
-- This will drop and recreate the courses and lessons tables with the correct schema

-- You can copy and paste the contents of 002_fix_courses_lessons_schema.sql
-- Or run it via Supabase CLI:
-- supabase db reset
-- supabase db push

-- Alternatively, run this single command to apply the migration:
\i 002_fix_courses_lessons_schema.sql