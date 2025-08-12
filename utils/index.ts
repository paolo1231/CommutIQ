import AsyncStorage from '@react-native-async-storage/async-storage';
import { VALIDATION_RULES, ERROR_MESSAGES, STORAGE_KEYS } from '../constants';
import { AppError, ErrorCode, UserProfile, Course, UserProgress } from '../types';

// Validation Utilities
export const validateEmail = (email: string): boolean => {
  return VALIDATION_RULES.EMAIL.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= VALIDATION_RULES.PASSWORD_MIN_LENGTH;
};

export const validateCommuteTime = (time: number): boolean => {
  return time >= VALIDATION_RULES.COMMUTE_TIME_MIN && time <= VALIDATION_RULES.COMMUTE_TIME_MAX;
};

export const validateUsername = (username: string): boolean => {
  return username.length >= VALIDATION_RULES.USERNAME_MIN_LENGTH && 
         username.length <= VALIDATION_RULES.USERNAME_MAX_LENGTH;
};

// Error Handling Utilities
export const createAppError = (code: ErrorCode, message?: string, details?: any): AppError => {
  return {
    code,
    message: message || ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR,
    details,
    timestamp: new Date().toISOString(),
  };
};

export const handleApiError = (error: any): AppError => {
  console.error('API Error:', error);
  
  if (!error) {
    return createAppError('UNKNOWN_ERROR');
  }

  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return createAppError('NETWORK_ERROR');
  }

  if (error.message?.includes('auth') || error.status === 401) {
    return createAppError('AUTH_ERROR');
  }

  if (error.status === 400) {
    return createAppError('VALIDATION_ERROR');
  }

  return createAppError('UNKNOWN_ERROR', error.message, error);
};

// Storage Utilities
export const storeData = async (key: string, value: any): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (error) {
    console.error(`Error storing data for key ${key}:`, error);
    throw createAppError('STORAGE_ERROR');
  }
};

export const retrieveData = async <T>(key: string): Promise<T | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error(`Error retrieving data for key ${key}:`, error);
    return null;
  }
};

export const removeData = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing data for key ${key}:`, error);
    throw createAppError('STORAGE_ERROR');
  }
};

export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('Error clearing all data:', error);
    throw createAppError('STORAGE_ERROR');
  }
};

// Time and Date Utilities
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
};

export const getRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString();
  }
};

// Progress Calculation Utilities
export const calculateCourseProgress = (course: Course, progressList: UserProgress[]): number => {
  if (!course.lessons || course.lessons.length === 0) {
    return 0;
  }

  const courseProgress = progressList.filter(p => p.course_id === course.id);
  const completedLessons = courseProgress.filter(p => p.progress_percentage >= 100).length;
  
  return (completedLessons / course.lessons.length) * 100;
};

export const calculateOverallProgress = (courses: Course[], progressList: UserProgress[]): number => {
  if (courses.length === 0) {
    return 0;
  }

  const totalCourseProgress = courses.reduce((sum, course) => {
    return sum + calculateCourseProgress(course, progressList);
  }, 0);

  return totalCourseProgress / courses.length;
};

export const getCompletedLessonsCount = (progressList: UserProgress[]): number => {
  return progressList.filter(p => p.progress_percentage >= 100).length;
};

export const getTotalLearningTime = (progressList: UserProgress[]): number => {
  return progressList.reduce((total, progress) => total + progress.time_spent, 0);
};

// Text Processing Utilities
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength).trim() + '...';
};

export const capitalizeFirstLetter = (text: string): string => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const capitalizeWords = (text: string): string => {
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

// Array Utilities
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const groupBy = <T, K extends keyof any>(array: T[], key: (item: T) => K): Record<K, T[]> => {
  return array.reduce((groups, item) => {
    const groupKey = key(item);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<K, T[]>);
};

export const uniqueBy = <T, K>(array: T[], keyFn: (item: T) => K): T[] => {
  const seen = new Set<K>();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

// Number Utilities
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const roundToDecimalPlaces = (value: number, decimalPlaces: number): number => {
  const factor = Math.pow(10, decimalPlaces);
  return Math.round(value * factor) / factor;
};

export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Network Utilities
export const isOnline = async (): Promise<boolean> => {
  try {
    // Simple network connectivity check
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      cache: 'no-cache',
    });
    return response.ok;
  } catch {
    return false;
  }
};

export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};

// Device Utilities
export const generateDeviceId = (): string => {
  // Generate a unique device identifier
  return 'device_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const getDeviceInfo = (): { name: string; type: string; platform: string } => {
  // This would be implemented with platform-specific code
  return {
    name: 'Mobile Device',
    type: 'mobile',
    platform: 'ios', // or 'android'
  };
};

// Audio Utilities
export const formatAudioTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const calculateAudioProgress = (currentTime: number, duration: number): number => {
  if (duration === 0) return 0;
  return clamp((currentTime / duration) * 100, 0, 100);
};

// Subject and Course Utilities
export const getSubjectIcon = (subjectName: string): string => {
  const iconMap: Record<string, string> = {
    'Languages': 'globe-outline',
    'Chess': 'extension-puzzle-outline',
    'History': 'library-outline',
    'Music Theory': 'musical-notes-outline',
    'Programming': 'code-slash-outline',
    'Literature': 'book-outline',
    'Science': 'flask-outline',
    'Business': 'briefcase-outline',
  };

  return iconMap[subjectName] || 'book-outline';
};

export const getSubjectColor = (subjectName: string): { background: string; text: string } => {
  const colorMap: Record<string, { background: string; text: string }> = {
    'Languages': { background: '#dbeafe', text: '#2563eb' },
    'Chess': { background: '#fef3c7', text: '#d97706' },
    'History': { background: '#d1fae5', text: '#059669' },
    'Music Theory': { background: '#e9d5ff', text: '#9333ea' },
    'Programming': { background: '#fee2e2', text: '#dc2626' },
    'Literature': { background: '#ccfbf1', text: '#0d9488' },
    'Science': { background: '#e0f2fe', text: '#0277bd' },
    'Business': { background: '#f3e8ff', text: '#7c3aed' },
  };

  return colorMap[subjectName] || { background: '#f3f4f6', text: '#374151' };
};

// Debug Utilities
export const debugLog = (message: string, data?: any): void => {
  if (__DEV__) {
    console.log(`[CommutIQ Debug] ${message}`, data || '');
  }
};

export const debugError = (message: string, error?: any): void => {
  if (__DEV__) {
    console.error(`[CommutIQ Error] ${message}`, error || '');
  }
};

// Feature Flag Utilities
export const isFeatureEnabled = async (featureName: string): Promise<boolean> => {
  try {
    const featureFlags = await retrieveData<Record<string, boolean>>('feature_flags');
    return featureFlags?.[featureName] ?? false;
  } catch {
    return false;
  }
};

// Export all utilities
export default {
  // Validation
  validateEmail,
  validatePassword,
  validateCommuteTime,
  validateUsername,

  // Error handling
  createAppError,
  handleApiError,

  // Storage
  storeData,
  retrieveData,
  removeData,
  clearAllData,

  // Time and date
  formatDuration,
  formatTimeAgo,
  getRelativeDate,

  // Progress calculation
  calculateCourseProgress,
  calculateOverallProgress,
  getCompletedLessonsCount,
  getTotalLearningTime,

  // Text processing
  truncateText,
  capitalizeFirstLetter,
  capitalizeWords,

  // Array utilities
  shuffleArray,
  groupBy,
  uniqueBy,

  // Number utilities
  clamp,
  roundToDecimalPlaces,
  formatBytes,

  // Network utilities
  isOnline,
  retryWithBackoff,

  // Device utilities
  generateDeviceId,
  getDeviceInfo,

  // Audio utilities
  formatAudioTime,
  calculateAudioProgress,

  // Subject utilities
  getSubjectIcon,
  getSubjectColor,

  // Debug utilities
  debugLog,
  debugError,

  // Feature flags
  isFeatureEnabled,
};
