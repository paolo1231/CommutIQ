// App Constants and Configuration

// Environment Configuration
export const ENV = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || '',

  // S3 Storage Configuration
  S3_STORAGE_URL: process.env.S3_STORAGE_URL || '',
  S3_REGION: process.env.S3_REGION || 'us-west-1',
  S3_ACCESS_ID: process.env.S3_ACCESS_ID || '',
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || '',
};

// Debug environment variables (only in development)
if (__DEV__) {
  console.log('Environment Variables Loaded:');
  console.log('SUPABASE_URL:', ENV.SUPABASE_URL ? 'SET' : 'NOT SET');
  console.log('SUPABASE_ANON_KEY:', ENV.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
  console.log('OPENAI_API_KEY:', ENV.OPENAI_API_KEY ? 'SET' : 'NOT SET');
  console.log('API_BASE_URL:', ENV.API_BASE_URL ? 'SET' : 'NOT SET');
  console.log('S3_STORAGE_URL:', ENV.S3_STORAGE_URL ? 'SET' : 'NOT SET');
  console.log('S3_REGION:', ENV.S3_REGION);
  console.log('S3_ACCESS_ID:', ENV.S3_ACCESS_ID ? 'SET' : 'NOT SET');
  console.log('S3_ACCESS_KEY:', ENV.S3_ACCESS_KEY ? 'SET' : 'NOT SET');

  if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
    console.warn('⚠️  Supabase environment variables are missing!');
    console.warn('Make sure your .env file has:');
    console.warn('EXPO_PUBLIC_SUPABASE_URL=your-supabase-url');
    console.warn('EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key');
  }

  if (!ENV.S3_STORAGE_URL || !ENV.S3_ACCESS_ID || !ENV.S3_ACCESS_KEY) {
    console.warn('⚠️  S3 Storage environment variables are missing!');
    console.warn('Make sure your .env file has:');
    console.warn('S3_STORAGE_URL=your-s3-storage-url');
    console.warn('S3_ACCESS_ID=your-s3-access-id');
    console.warn('S3_ACCESS_KEY=your-s3-access-key');
  }
}

// App Configuration
export const APP_CONFIG = {
  NAME: 'CommutIQ',
  VERSION: '1.0.0',
  BUILD_VERSION: '1',
  BUNDLE_ID: 'com.commutiq.app',
};

// Learning Configuration
export const LEARNING_CONFIG = {
  MIN_COMMUTE_TIME: 5, // minutes
  MAX_COMMUTE_TIME: 240, // 4 hours
  DEFAULT_COMMUTE_TIME: 30,
  LESSON_BUFFER_COUNT: 5, // Number of lessons to pre-download
  MAX_OFFLINE_STORAGE: 500, // MB
  SYNC_INTERVAL: 5 * 60 * 1000, // 5 minutes in milliseconds
};

// Audio Configuration
export const AUDIO_CONFIG = {
  DEFAULT_PLAYBACK_SPEED: 1.0,
  MIN_PLAYBACK_SPEED: 0.5,
  MAX_PLAYBACK_SPEED: 2.0,
  PLAYBACK_SPEED_STEP: 0.25,
  DEFAULT_QUALITY: 'standard' as const,
  SKIP_FORWARD_SECONDS: 15,
  SKIP_BACKWARD_SECONDS: 10,
};

// Subscription Configuration
export const SUBSCRIPTION_CONFIG = {
  PREMIUM_PRICE: 7.99,
  CURRENCY: 'USD',
  BILLING_CYCLE: 'monthly' as const,
  FREE_LESSON_LIMIT: 3,
  PREMIUM_FEATURES: [
    'Unlimited access to all subjects',
    'Expert-curated learning plans',
    'Official certificates and credentials',
    'Exclusive partner content',
    'Ad-free learning experience',
    'Priority customer support',
  ],
};

// UI Configuration
export const UI_CONFIG = {
  COLORS: {
    PRIMARY: '#4f46e5', // Indigo
    SECONDARY: '#f59e0b', // Amber
    SUCCESS: '#10b981', // Emerald
    ERROR: '#ef4444', // Red
    WARNING: '#f59e0b', // Amber
    INFO: '#3b82f6', // Blue

    // Grays
    GRAY_50: '#f9fafb',
    GRAY_100: '#f3f4f6',
    GRAY_200: '#e5e7eb',
    GRAY_300: '#d1d5db',
    GRAY_400: '#9ca3af',
    GRAY_500: '#6b7280',
    GRAY_600: '#4b5563',
    GRAY_700: '#374151',
    GRAY_800: '#1f2937',
    GRAY_900: '#111827',

    // Background Colors
    BACKGROUND: '#f8fafc',
    SURFACE: '#ffffff',
    CARD: '#ffffff',

    // Text Colors
    TEXT_PRIMARY: '#1f2937',
    TEXT_SECONDARY: '#6b7280',
    TEXT_DISABLED: '#9ca3af',
    TEXT_ON_PRIMARY: '#ffffff',
  },

  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
    XXL: 48,
  },

  BORDER_RADIUS: {
    SM: 4,
    MD: 6,
    LG: 8,
    XL: 12,
    FULL: 9999,
  },

  FONT_SIZES: {
    XS: 12,
    SM: 14,
    MD: 16,
    LG: 18,
    XL: 20,
    XXL: 24,
    XXXL: 32,
  },

  SHADOWS: {
    SM: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.22,
      shadowRadius: 2.22,
      elevation: 3,
    },
    MD: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    LG: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
    },
  },
};

// Subject Categories Configuration
export const SUBJECTS_CONFIG = [
  {
    id: 'languages',
    name: 'Languages',
    icon: 'globe-outline',
    color: { background: '#dbeafe', text: '#2563eb' },
    category: 'Communication',
    is_premium: false,
  },
  {
    id: 'chess',
    name: 'Chess',
    icon: 'extension-puzzle-outline',
    color: { background: '#fef3c7', text: '#d97706' },
    category: 'Strategy',
    is_premium: false,
  },
  {
    id: 'history',
    name: 'History',
    icon: 'library-outline',
    color: { background: '#d1fae5', text: '#059669' },
    category: 'Humanities',
    is_premium: false,
  },
  {
    id: 'music',
    name: 'Music Theory',
    icon: 'musical-notes-outline',
    color: { background: '#e9d5ff', text: '#9333ea' },
    category: 'Arts',
    is_premium: false,
  },
  {
    id: 'programming',
    name: 'Programming',
    icon: 'code-slash-outline',
    color: { background: '#fee2e2', text: '#dc2626' },
    category: 'Technology',
    is_premium: false,
  },
  {
    id: 'literature',
    name: 'Literature',
    icon: 'book-outline',
    color: { background: '#ccfbf1', text: '#0d9488' },
    category: 'Humanities',
    is_premium: false,
  },
  {
    id: 'science',
    name: 'Science',
    icon: 'flask-outline',
    color: { background: '#e0f2fe', text: '#0277bd' },
    category: 'STEM',
    is_premium: true,
  },
  {
    id: 'business',
    name: 'Business',
    icon: 'briefcase-outline',
    color: { background: '#f3e8ff', text: '#7c3aed' },
    category: 'Professional',
    is_premium: true,
  },
];

// Storage Keys
export const STORAGE_KEYS = {
  USER_PROFILE: '@commutiq:user_profile',
  USER_PREFERENCES: '@commutiq:user_preferences',
  OFFLINE_COURSES: '@commutiq:offline_courses',
  OFFLINE_LESSONS: '@commutiq:offline_lessons',
  PROGRESS_QUEUE: '@commutiq:progress_queue',
  SYNC_STATE: '@commutiq:sync_state',
  AUTH_TOKEN: '@commutiq:auth_token',
  ONBOARDING_COMPLETE: '@commutiq:onboarding_complete',
  FIRST_LAUNCH: '@commutiq:first_launch',
};

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    SIGN_UP: '/auth/signup',
    SIGN_IN: '/auth/signin',
    SIGN_OUT: '/auth/signout',
    REFRESH: '/auth/refresh',
  },
  USER: {
    PROFILE: '/user/profile',
    PREFERENCES: '/user/preferences',
    SUBJECTS: '/user/subjects',
    PROGRESS: '/user/progress',
  },
  COURSES: {
    LIST: '/courses',
    DETAIL: '/courses/:id',
    GENERATE: '/courses/generate',
    LESSONS: '/courses/:id/lessons',
  },
  LESSONS: {
    DETAIL: '/lessons/:id',
    AUDIO: '/lessons/:id/audio',
    TRANSCRIPT: '/lessons/:id/transcript',
    INTERACTIONS: '/lessons/:id/interactions',
  },
  CONTENT: {
    GENERATE_COURSE: '/content/generate/course',
    GENERATE_LESSON: '/content/generate/lesson',
    GENERATE_AUDIO: '/content/generate/audio',
  },
  SYNC: {
    STATUS: '/sync/status',
    UPLOAD: '/sync/upload',
    DOWNLOAD: '/sync/download',
  },
};

// OpenAI Configuration
export const OPENAI_CONFIG = {
  API_URL: 'https://api.openai.com/v1',
  MODELS: {
    CHAT: 'gpt-4',
    TTS: 'tts-1',
  },
  TTS_VOICES: [
    'sage',
    'echo',
    'fable',
    'onyx',
    'nova',
    'shimmer',
  ],
  MAX_TOKENS: {
    COURSE_GENERATION: 2000,
    LESSON_GENERATION: 1500,
    INTERACTION_GENERATION: 500,
  },
  TEMPERATURE: 0.7,
  REQUEST_TIMEOUT: 30000, // 30 seconds
};

// File System Configuration
export const FILE_SYSTEM_CONFIG = {
  AUDIO_DIR: 'audio',
  CACHE_DIR: 'cache',
  TEMP_DIR: 'temp',
  MAX_CACHE_SIZE: 1024 * 1024 * 500, // 500MB
  CLEANUP_THRESHOLD: 0.8, // Cleanup when 80% full
  FILE_EXTENSIONS: {
    AUDIO: '.mp3',
    TRANSCRIPT: '.txt',
    METADATA: '.json',
  },
};

// Storage Configuration
export const STORAGE_CONFIG = {
  BUCKETS: {
    LESSON_AUDIO: 'lesson-audio',
    USER_UPLOADS: 'user-uploads',
  },
  AUDIO_FORMATS: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'],
  MAX_FILE_SIZE: {
    LESSON_AUDIO: 50 * 1024 * 1024, // 50MB
    USER_UPLOADS: 10 * 1024 * 1024, // 10MB
  },
  QUALITY_LEVELS: {
    STANDARD: 'standard',
    HIGH: 'high',
  },
  CDN_CONFIG: {
    CACHE_CONTROL: 'public, max-age=31536000', // 1 year
    CONTENT_ENCODING: 'gzip',
  },
};

// Network Configuration
export const NETWORK_CONFIG = {
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  OFFLINE_THRESHOLD: 5000, // Consider offline after 5 seconds
};

// Analytics Events
export const ANALYTICS_EVENTS = {
  // User Events
  USER_REGISTERED: 'user_registered',
  USER_SIGNED_IN: 'user_signed_in',
  USER_SIGNED_OUT: 'user_signed_out',

  // Onboarding Events
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  COMMUTE_TIME_SET: 'commute_time_set',
  SUBJECTS_SELECTED: 'subjects_selected',

  // Learning Events
  COURSE_STARTED: 'course_started',
  LESSON_STARTED: 'lesson_started',
  LESSON_COMPLETED: 'lesson_completed',
  LESSON_PAUSED: 'lesson_paused',
  LESSON_RESUMED: 'lesson_resumed',
  LESSON_SKIPPED: 'lesson_skipped',

  // Engagement Events
  DAILY_STREAK: 'daily_streak',
  WEEKLY_GOAL_REACHED: 'weekly_goal_reached',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',

  // Premium Events
  PREMIUM_VIEWED: 'premium_viewed',
  PREMIUM_PURCHASED: 'premium_purchased',
  PREMIUM_CANCELLED: 'premium_cancelled',

  // Technical Events
  SYNC_COMPLETED: 'sync_completed',
  OFFLINE_MODE_ENTERED: 'offline_mode_entered',
  AUDIO_ERROR: 'audio_error',
  CONTENT_GENERATION_ERROR: 'content_generation_error',
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Please check your internet connection and try again.',
  AUTH_ERROR: 'Authentication failed. Please sign in again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  CONTENT_GENERATION_ERROR: 'Unable to generate content right now. Please try again later.',
  AUDIO_PLAYBACK_ERROR: 'Unable to play audio. Please check your device settings.',
  STORAGE_ERROR: 'Not enough storage space available.',
  SYNC_ERROR: 'Unable to sync your progress. Will retry when connection improves.',
  SUBSCRIPTION_ERROR: 'Unable to process subscription. Please try again.',
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',

  // Authentication specific errors
  AUTH: {
    INVALID_EMAIL: 'Please enter a valid email address.',
    EMAIL_REQUIRED: 'Email address is required.',
    PASSWORD_REQUIRED: 'Password is required.',
    PASSWORD_TOO_SHORT: 'Password must be at least 8 characters long.',
    PASSWORD_TOO_WEAK: 'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
    PASSWORDS_DONT_MATCH: 'Passwords do not match.',
    INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
    EMAIL_NOT_CONFIRMED: 'Please check your email and click the confirmation link before signing in.',
    EMAIL_ALREADY_EXISTS: 'An account with this email already exists. Please sign in instead.',
    USER_NOT_FOUND: 'No account found with this email address.',
    TOO_MANY_ATTEMPTS: 'Too many failed attempts. Please try again later.',
    WEAK_PASSWORD: 'Password is too weak. Please choose a stronger password.',
    SIGNUP_DISABLED: 'New account registration is currently disabled.',
    EMAIL_RATE_LIMIT: 'Too many emails sent. Please wait before requesting another.',
    INVALID_TOKEN: 'Invalid or expired verification token.',
    SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  },
};

// Success Messages
export const SUCCESS_MESSAGES = {
  PROFILE_UPDATED: 'Your profile has been updated successfully.',
  PREFERENCES_SAVED: 'Your preferences have been saved.',
  LESSON_COMPLETED: 'Lesson completed! Great job!',
  COURSE_COMPLETED: 'Congratulations! You\'ve completed the course.',
  SYNC_COMPLETED: 'Your progress has been synced across all devices.',
  PREMIUM_ACTIVATED: 'Welcome to CommutIQ Premium!',
  CONTENT_DOWNLOADED: 'Content downloaded for offline use.',

  // Authentication specific success messages
  AUTH: {
    SIGNUP_SUCCESS: 'Account created successfully! Please check your email to verify your account.',
    SIGNIN_SUCCESS: 'Welcome back! You\'ve been signed in successfully.',
    SIGNOUT_SUCCESS: 'You\'ve been signed out successfully.',
    PASSWORD_RESET_SENT: 'Password reset instructions have been sent to your email.',
    PASSWORD_RESET_SUCCESS: 'Your password has been updated successfully.',
    EMAIL_VERIFIED: 'Your email has been verified successfully!',
    PROFILE_CREATED: 'Your profile has been created successfully.',
  },
};

// Validation Rules
export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  COMMUTE_TIME_MIN: 5,
  COMMUTE_TIME_MAX: 240,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  COURSE_TITLE_MAX_LENGTH: 100,
  LESSON_TITLE_MAX_LENGTH: 80,

  // Authentication specific validation
  AUTH: {
    EMAIL_MAX_LENGTH: 254,
    PASSWORD_MAX_LENGTH: 128,
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 50,
  },
};

// Feature Flags
export const FEATURE_FLAGS = {
  OFFLINE_MODE: true,
  SPOTIFY_INTEGRATION: true,
  APPLE_MUSIC_INTEGRATION: true,
  PUSH_NOTIFICATIONS: true,
  ANALYTICS: true,
  CRASH_REPORTING: true,
  BETA_FEATURES: false,
  PREMIUM_FEATURES: true,
};
