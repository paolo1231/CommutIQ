// Core Data Models for CommutIQ App

export interface UserProfile {
  id: string;
  commute_time: number; // minutes
  subscription_tier: 'free' | 'premium';
  created_at: string;
  last_active_at: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  audioSpeed: number; // 0.5x to 2.0x
  autoPlay: boolean;
  downloadQuality: 'standard' | 'high';
  notificationsEnabled: boolean;
  backgroundPlayback: boolean;
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: string;
  is_premium: boolean;
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  subject_id: string;
  user_id: string;
  total_lessons: number;
  estimated_duration: number; // total minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  is_premium: boolean;
  created_at: string;
  completed_lessons?: number; // number of completed lessons
  next_lesson?: {
    id: string;
    title: string;
    duration: number;
    lesson_order: number;
  }; // next lesson to be taken
  subject?: Subject; // joined data
  lessons?: Lesson[]; // joined data
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  content: string; // AI-generated content
  audio_url?: string; // Supabase Storage URL
  duration: number; // minutes
  transcript: string;
  lesson_order: number;
  created_at: string;
}

export interface UserSubject {
  id: string;
  user_id: string;
  subject_id: string;
  priority: number;
  created_at: string;
  subject?: Subject; // joined data
}

export interface UserProgress {
  id: string;
  user_id: string;
  course_id: string;
  lesson_id: string;
  progress_percentage: number;
  time_spent: number; // seconds
  last_position: number; // audio position in seconds
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// Lesson Interaction Types
export interface LessonInteraction {
  id: string;
  lesson_id: string;
  type: 'quiz' | 'reflection' | 'discussion';
  title: string;
  content: QuizContent | ReflectionContent | DiscussionContent;
  position_seconds: number; // When to show interaction during playback
  is_required: boolean;
  metadata?: any;
  created_at: string;
  updated_at?: string;
}

// Quiz specific content structure
export interface QuizContent {
  question: string;
  options: QuizOption[];
  correct_answer_index: number;
  explanation?: string;
  time_limit_seconds?: number;
}

export interface QuizOption {
  id: string;
  text: string;
  is_correct?: boolean;
}

// Reflection specific content structure
export interface ReflectionContent {
  prompt: string;
  suggested_response_length?: number; // in words
  guidance_points?: string[];
  example_response?: string;
}

// Discussion specific content structure
export interface DiscussionContent {
  topic: string;
  discussion_points: string[];
  starter_questions?: string[];
  resources?: DiscussionResource[];
}

export interface DiscussionResource {
  title: string;
  url?: string;
  description?: string;
}

export interface UserInteractionResponse {
  id: string;
  user_id: string;
  interaction_id: string;
  response: QuizResponse | ReflectionResponse | DiscussionResponse;
  score?: number; // 0-100 for quiz, optional for others
  completed_at: string;
  metadata?: any;
  created_at: string;
  updated_at?: string;
}

export interface QuizResponse {
  selected_option_id: string;
  selected_option_index: number;
  is_correct: boolean;
  time_taken_seconds: number;
}

export interface ReflectionResponse {
  text: string;
  word_count: number;
}

export interface DiscussionResponse {
  thoughts: string;
  selected_points: string[];
  additional_questions?: string[];
}

// Cross-Device Sync Models
export interface UserDevice {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string;
  device_type: 'mobile' | 'web' | 'tablet';
  platform: string; // 'ios', 'android', 'web'
  last_active_at: string;
  push_token?: string;
  created_at: string;
}

export interface SyncState {
  id: string;
  user_id: string;
  device_id: string;
  last_sync_at: string;
  sync_version: number;
  pending_changes: any[];
  created_at: string;
  updated_at: string;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: string;
  pendingChanges: number;
  syncInProgress: boolean;
  conflictsDetected: boolean;
}

export interface SyncData {
  courses: Course[];
  progress: UserProgress[];
  profile?: UserProfile;
  version: number;
}

export interface SyncResult {
  success: boolean;
  updatedCourses: number;
  updatedProgress: number;
  lastSyncTime: string;
}

export interface UserDataExport {
  profile: UserProfile;
  courses: Course[];
  progress: UserProgress[];
  preferences: UserPreferences;
  exportDate: string;
}

// API Response Types
export interface APIResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthResponse {
  user?: any;
  session?: any;
  error?: any;
}

// UI Component Props Types
export interface CourseCardProps {
  course: Course;
  progress?: UserProgress;
  onStartLesson: () => void;
}

export interface ProgressBarProps {
  progress: number; // 0 to 1
  height?: number;
  color?: string;
  backgroundColor?: string;
}

export interface AudioPlayerProps {
  lesson: Lesson;
  progress: UserProgress;
  onProgressUpdate: (progress: number) => void;
  onComplete: () => void;
}

// Content Generation Types
export interface CourseGenerationRequest {
  subject_id: string;
  user_id: string;
  commute_time: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface LessonGenerationRequest {
  course_id: string;
  lesson_order: number;
  duration: number; // minutes
  topic: string;
  previous_lessons?: string[];
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    index: number;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Storage and Audio Types
export interface AudioCacheInfo {
  lessonId: string;
  localPath: string;
  remoteUrl: string;
  size: number;
  quality: 'standard' | 'high';
  downloadedAt: string;
  lastAccessedAt: string;
}

export interface AudioUploadResult {
  url: string;
  path: string;
  size: number;
  duration?: number;
}

export interface StorageUploadOptions {
  bucket?: string;
  quality?: 'standard' | 'high';
  contentType?: string;
  metadata?: Record<string, any>;
  cacheControl?: string;
  contentEncoding?: string;
}

export interface StorageListOptions {
  limit?: number;
  offset?: number;
  prefix?: string;
  delimiter?: string;
}

export interface StorageFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: {
    eTag: string;
    size: number;
    mimetype: string;
    cacheControl: string;
    lastModified: string;
    contentLength: number;
    httpStatusCode: number;
    quality?: string;
    uploaded_at?: string;
    cdn_optimized?: boolean;
    cache_status?: string;
  };
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  availableSpace: number;
  oldestFile: string | null;
  newestFile: string | null;
}

export interface CacheStats {
  totalFiles: number;
  totalSize: number;
  availableSpace: number;
  oldestFile: string | null;
  newestFile: string | null;
}

export interface AudioQualityStats {
  high_quality: {
    count: number;
    total_size: number;
  };
  standard_quality: {
    count: number;
    total_size: number;
  };
  total: {
    count: number;
    total_size: number;
  };
}

// External Integration Types
export interface SpotifyIntegration {
  user_id: string;
  access_token: string;
  refresh_token: string;
  playlist_id?: string;
  expires_at: string;
}

export interface AppleMusicIntegration {
  user_id: string;
  developer_token: string;
  user_token: string;
  library_id?: string;
}

// Navigation Types
export type RootStackParamList = {
  Onboarding: undefined;
  SubjectSelection: { commuteTime: number };
  Dashboard: undefined;
  Lesson: { lessonId: string; courseId?: string };
  Course: { courseId: string };
  Settings: undefined;
  Premium: undefined;
  Auth: undefined;
};

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'CONTENT_GENERATION_ERROR'
  | 'AUDIO_PLAYBACK_ERROR'
  | 'STORAGE_ERROR'
  | 'SYNC_ERROR'
  | 'SUBSCRIPTION_ERROR';

// App State Types
export interface AppState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isOnline: boolean;
  courses: Course[];
  progress: UserProgress[];
  settings: UserPreferences;
  syncStatus: SyncStatus;
}

export interface AppAction {
  type: string;
  payload?: any;
}
