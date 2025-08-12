# Environment Setup Troubleshooting Guide

## Issue Fixed: Supabase Environment Variables

The issue was that your `.env` file was using the wrong variable names. In Expo, environment variables that need to be accessible in the client app must be prefixed with `EXPO_PUBLIC_`.

## ✅ What Was Fixed:

### Before (Incorrect):
```env
SUPABASE_URL=https://qjeavwwdqpoahzuvqniz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
OPENAI_API_KEY=sk-proj-91NgAW4fc8dVPeOBU...
```

### After (Correct):
```env
EXPO_PUBLIC_SUPABASE_URL=https://qjeavwwdqpoahzuvqniz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-91NgAW4fc8dVPeOBU...
```

## How to Verify It's Working:

1. **Check Console Logs**: When you start the app, you should see debug logs in your console showing:
   ```
   Environment Variables Loaded:
   SUPABASE_URL: SET
   SUPABASE_ANON_KEY: SET
   OPENAI_API_KEY: SET
   API_BASE_URL: NOT SET
   ```

2. **If You See Warnings**: If you see warning messages like:
   ```
   ⚠️  Supabase environment variables are missing!
   ```
   Then the environment variables are not being loaded properly.

## Common Issues & Solutions:

### 1. Environment Variables Not Loading
**Problem**: Console shows "NOT SET" for Supabase variables
**Solution**: 
- Make sure your `.env` file is in the project root directory
- Restart your Expo development server (`expo start`)
- Verify variable names have `EXPO_PUBLIC_` prefix

### 2. .env File Location
**Correct Location**: 
```
D:\PAOLO\PROJECTS\commutiq-expo\.env  ✅
```

**Incorrect Locations**:
```
D:\PAOLO\PROJECTS\commutiq-expo\app\.env  ❌
D:\PAOLO\PROJECTS\commutiq-expo\src\.env  ❌
```

### 3. Restart Required
After changing environment variables, you must:
1. Stop the Expo development server (Ctrl+C)
2. Run `expo start` again
3. The new environment variables will be loaded

### 4. Variable Naming Rules
- ✅ Client-side variables: `EXPO_PUBLIC_VARIABLE_NAME`
- ❌ Server-only variables: `VARIABLE_NAME` (won't be accessible in React Native)

## Testing the Fix:

1. **Start the development server**:
   ```bash
   expo start
   ```

2. **Check the console output** - you should see:
   ```
   Environment Variables Loaded:
   SUPABASE_URL: SET
   SUPABASE_ANON_KEY: SET
   ```

3. **Try to authenticate** - the auth screen should now be able to connect to Supabase

4. **Check for errors** - No more "cannot find supabase info" errors

## Your Current .env File:
```env
# Supabase Configuration (Client-side accessible)
EXPO_PUBLIC_SUPABASE_URL=https://qjeavwwdqpoahzuvqniz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Server-side only (for backend services)
S3_STORAGE_URL=https://qjeavwwdqpoahzuvqniz.storage.supabase.co/storage/v1/s3
S3_REGION=us-west-1
S3_ACCESS_ID=923bcdcd1e3dd75b0b0fd6a946a6c5ea
S3_ACCESS_KEY=305314c07329411d0b4bc24dd8175a3f358160a730b6aa052c3393501e6ee429

# OpenAI Configuration (Client-side accessible)
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-91NgAW4fc8dVPeOBU...

# Environment
NODE_ENV=development
```

## Security Note:
Environment variables with `EXPO_PUBLIC_` prefix are included in the client bundle and visible to users. Only use this prefix for:
- ✅ Public API keys (like Supabase anon key)
- ✅ Public URLs and endpoints
- ❌ Private API keys or secrets

## Next Steps:
After applying these fixes, your CommutIQ app should be able to:
1. Connect to Supabase successfully
2. Authenticate users
3. Save user profiles and preferences
4. Load subjects from the database

The environment variables are now properly configured for the onboarding flow to work correctly!
