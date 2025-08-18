# Free User Lessons Fix

This directory contains scripts to debug and fix the issue where free users have empty lesson lists for their pre-generated courses.

## The Problem

Free users are assigned pre-generated courses, but the lessons remain in the `pre_generated_lessons` table and are not copied to the regular `lessons` table that the app expects. This causes empty lesson lists when users view their courses.

## The Solution

We've implemented a two-part fix:

1. **Updated the assignment process** - When assigning pre-generated courses to users, lessons are now copied to the regular `lessons` table
2. **Migration script** - For existing users who already have broken courses, we provide a migration script

## Files

### `debug-free-courses.js`
A comprehensive debugging script that checks:
- Pre-generated courses in the database
- Pre-generated lessons for each course  
- User courses linked to pre-generated courses
- Tests the course fetching process

**Usage:**
```bash
# Replace the Supabase credentials in the file first
node debug-free-courses.js
```

### `migrate-free-user-lessons.js`
A migration script that finds user courses with `pre_generated_course_id` but no lessons, and copies the lessons from the pre-generated table.

**Usage:**
```bash
# Replace the Supabase credentials in the file first

# Test mode - see what would be migrated
node migrate-free-user-lessons.js test

# Actually perform the migration  
node migrate-free-user-lessons.js migrate
```

## Before Running Scripts

1. **Update credentials** in both scripts:
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL';
   const SUPABASE_SERVICE_KEY = 'YOUR_SUPABASE_SERVICE_KEY';
   ```

2. **Install dependencies**:
   ```bash
   npm install @supabase/supabase-js
   ```

## Code Changes Made

### 1. `preGeneratedContentService.ts`
Updated `assignPreGeneratedCourseToUser()` to copy lessons from `pre_generated_lessons` to `lessons` table when assigning courses to users.

### 2. `supabaseService.ts` 
Enhanced `getCourseWithProgress()` with:
- Better debugging logs
- Fallback logic to fetch from `pre_generated_lessons` if regular lessons are missing
- Enhanced error handling

### 3. Course Detail Screen
Added debugging logs to track course loading and lesson counts.

## Testing the Fix

1. **Run the debug script** to understand your current database state
2. **Run the migration in test mode** to see what courses would be affected
3. **Run the actual migration** to fix existing courses
4. **Test a free user account** by selecting a course like Chess and verifying lessons appear

## Expected Debug Output

When the fix is working, you should see logs like:
```
getCourseWithProgress Debug: {
  courseId: "abc123",
  courseName: "Chess Fundamentals", 
  preGeneratedCourseId: "xyz789",
  regularLessonsCount: 8,
  isPreGenerated: true
}

Final course data: {
  title: "Chess Fundamentals",
  lessonsCount: 8,
  completedLessons: 0,
  hasNextLesson: true
}
```

## Database Schema Requirements

This fix assumes you have these tables:
- `courses` - User-specific courses
- `lessons` - Regular lessons table
- `pre_generated_courses` - Template courses  
- `pre_generated_lessons` - Template lessons
- `user_progress` - User lesson progress tracking

The `courses` table should have a `pre_generated_course_id` column linking to `pre_generated_courses.id`.

## Rollback

If something goes wrong, you can rollback by:
1. Deleting the migrated lessons: `DELETE FROM lessons WHERE course_id IN (SELECT id FROM courses WHERE pre_generated_course_id IS NOT NULL)`
2. The original pre-generated data remains intact in the `pre_generated_*` tables
