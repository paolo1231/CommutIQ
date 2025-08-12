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

export interface LessonInteraction {
  id: string;
  lesson_id: string;
  type: 'quiz' | 'reflection' | 'practice';
  prompt: string;
  options?: string[];
  correct_answer?: string;
  interaction_order: number;
  created_at: string;
}

export interface UserInteractionResponse {
  id: string;
  user_id: string;
  interaction_id: string;
  user_response: string;
  is_correct?: boolean;
  completed_at: string;
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
  Lesson: { lessonId: string; courseId: string };
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
