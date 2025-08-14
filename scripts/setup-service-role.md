# Setting up Service Role Key for Course Generation

To run the course generation script, you need to add the Supabase service role key to your environment variables.

## How to get your Service Role Key:

1. **Go to your Supabase Dashboard**
   - Visit https://supabase.com/dashboard
   - Select your project

2. **Navigate to Settings > API**
   - In the left sidebar, click "Settings"
   - Then click "API"

3. **Copy the Service Role Key**
   - Look for the "service_role" key in the "Project API keys" section
   - This key has full access and bypasses Row Level Security (RLS)
   - **⚠️ IMPORTANT: Keep this key secret and never expose it in client-side code**

4. **Add to your .env file**
   ```env
   # Add this line to your .env file
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

## Alternative: Temporarily disable RLS

If you prefer not to use the service role key, you can temporarily disable RLS on the pre-generated content tables:

```sql
-- Run this in your Supabase SQL editor
ALTER TABLE pre_generated_courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE pre_generated_lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE pre_generated_lesson_interactions DISABLE ROW LEVEL SECURITY;

-- After running the script, re-enable RLS:
ALTER TABLE pre_generated_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_generated_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_generated_lesson_interactions ENABLE ROW LEVEL SECURITY;
```

## Running the Script

Once you have the service role key set up:

```bash
npm run generate:courses
```

The script will automatically detect and use the service role key for admin operations.