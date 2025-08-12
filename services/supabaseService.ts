import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthResponse, createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { ENV, STORAGE_KEYS } from '../constants';
import {
  APIResponse,
  Course,
  Lesson,
  LessonInteraction,
  Subject,
  UserInteractionResponse,
  UserProfile,
  UserProgress,
  UserSubject
} from '../types';

export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
      auth: {
        ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  // Authentication Methods
  async signUp(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
      });

      return { data, error };
    } catch (error) {
      console.error('SignUp Error:', error);
      return { error };
    }
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (data.user && !error) {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.session?.access_token || '');
      }

      return { data, error };
    } catch (error) {
      console.error('SignIn Error:', error);
      return { error };
    }
  }

  async signOut(): Promise<{ error: any }> {
    try {
      const { error } = await this.supabase.auth.signOut();
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
      return { error };
    } catch (error) {
      console.error('SignOut Error:', error);
      return { error };
    }
  }

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      return { user, error };
    } catch (error) {
      console.error('Get Current User Error:', error);
      return { user: null, error };
    }
  }

  async refreshSession() {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();
      return { data, error };
    } catch (error) {
      console.error('Refresh Session Error:', error);
      return { data: null, error };
    }
  }

  // Profile Management
  async createUserProfile(userId: string, profile: Partial<UserProfile>): Promise<APIResponse<UserProfile>> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .insert({
          id: userId,
          ...profile,
        })
        .select();

      if (error) throw error;

      // Cache profile locally
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(data));

      return { data };
    } catch (error) {
      console.error('Create User Profile Error:', error);
      return { error: error.message };
    }
  }

  async getUserProfile(userId: string): Promise<APIResponse<UserProfile>> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      // Cache profile locally
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(data));

      return { data };
    } catch (error) {
      console.error('Get User Profile Error:', error);

      // Try to get cached profile if network fails
      try {
        const cachedProfile = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
        if (cachedProfile) {
          return { data: JSON.parse(cachedProfile) };
        }
      } catch (cacheError) {
        console.error('Cache Error:', cacheError);
      }

      return { error: error.message };
    }
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<APIResponse<UserProfile>> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      // Update cached profile
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(data));

      return { data };
    } catch (error) {
      console.error('Update User Profile Error:', error);
      return { error: error.message };
    }
  }

  // Subject Management
  async getAllSubjects(): Promise<APIResponse<Subject[]>> {
    try {
      const { data, error } = await this.supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Get All Subjects Error:', error);
      return { error: error.message };
    }
  }

  async saveUserSubjects(userId: string, subjectIds: string[]): Promise<APIResponse<UserSubject[]>> {
    try {
      // First, delete existing user subjects
      await this.supabase
        .from('user_subjects')
        .delete()
        .eq('user_id', userId);

      // Then, insert new user subjects
      const userSubjects = subjectIds.map((subjectId, index) => ({
        user_id: userId,
        subject_id: subjectId,
        priority: index + 1,
      }));

      const { data, error } = await this.supabase
        .from('user_subjects')
        .insert(userSubjects)
        .select(`
          *,
          subject:subjects(*)
        `);

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Save User Subjects Error:', error);
      return { error: error.message };
    }
  }

  async getUserSubjects(userId: string): Promise<APIResponse<UserSubject[]>> {
    try {
      const { data, error } = await this.supabase
        .from('user_subjects')
        .select(`
          *,
          subject:subjects(*)
        `)
        .eq('user_id', userId)
        .order('priority');

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Get User Subjects Error:', error);
      return { error: error.message };
    }
  }

  // Course Management
  async createCourse(course: Omit<Course, 'id' | 'created_at'>): Promise<APIResponse<Course>> {
    try {
      const { data, error } = await this.supabase
        .from('courses')
        .insert(course)
        .select(`
          *,
          subject:subjects(*)
        `)
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Create Course Error:', error);
      return { error: error.message };
    }
  }

  async getUserCourses(userId: string): Promise<APIResponse<Course[]>> {
    try {
      const { data, error } = await this.supabase
        .from('courses')
        .select(`
          *,
          subject:subjects(*),
          lessons(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Cache courses locally for offline access
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_COURSES, JSON.stringify(data));

      return { data };
    } catch (error) {
      console.error('Get User Courses Error:', error);

      // Try to get cached courses if network fails
      try {
        const cachedCourses = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_COURSES);
        if (cachedCourses) {
          return { data: JSON.parse(cachedCourses) };
        }
      } catch (cacheError) {
        console.error('Cache Error:', cacheError);
      }

      return { error: error.message };
    }
  }

  async getCourseById(courseId: string): Promise<APIResponse<Course>> {
    try {
      const { data, error } = await this.supabase
        .from('courses')
        .select(`
          *,
          subject:subjects(*),
          lessons(*)
        `)
        .eq('id', courseId)
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Get Course By ID Error:', error);
      return { error: error.message };
    }
  }

  // Lesson Management
  async createLesson(lesson: Omit<Lesson, 'id' | 'created_at'>): Promise<APIResponse<Lesson>> {
    try {
      const { data, error } = await this.supabase
        .from('lessons')
        .insert(lesson)
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Create Lesson Error:', error);
      return { error: error.message };
    }
  }

  async getCourseLessons(courseId: string): Promise<APIResponse<Lesson[]>> {
    try {
      const { data, error } = await this.supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('lesson_order');

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Get Course Lessons Error:', error);
      return { error: error.message };
    }
  }

  async getLessonById(lessonId: string): Promise<APIResponse<Lesson>> {
    try {
      const { data, error } = await this.supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Get Lesson By ID Error:', error);
      return { error: error.message };
    }
  }

  // Progress Tracking
  async updateProgress(progress: Omit<UserProgress, 'id' | 'created_at' | 'updated_at'>): Promise<APIResponse<UserProgress>> {
    try {
      const { data, error } = await this.supabase
        .from('user_progress')
        .upsert({
          ...progress,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Update Progress Error:', error);

      // Queue progress update for offline sync
      await this.queueProgressUpdate(progress);

      return { error: error.message };
    }
  }

  async getUserProgress(userId: string, courseId?: string): Promise<APIResponse<UserProgress[]>> {
    try {
      let query = this.supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId);

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Get User Progress Error:', error);
      return { error: error.message };
    }
  }

  async getLessonProgress(userId: string, lessonId: string): Promise<APIResponse<UserProgress>> {
    try {
      const { data, error } = await this.supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
      return { data: data || null };
    } catch (error) {
      console.error('Get Lesson Progress Error:', error);
      return { error: error.message };
    }
  }

  // Interaction Management
  async createLessonInteraction(interaction: Omit<LessonInteraction, 'id' | 'created_at'>): Promise<APIResponse<LessonInteraction>> {
    try {
      const { data, error } = await this.supabase
        .from('lesson_interactions')
        .insert(interaction)
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Create Lesson Interaction Error:', error);
      return { error: error.message };
    }
  }

  async getLessonInteractions(lessonId: string): Promise<APIResponse<LessonInteraction[]>> {
    try {
      const { data, error } = await this.supabase
        .from('lesson_interactions')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('interaction_order');

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Get Lesson Interactions Error:', error);
      return { error: error.message };
    }
  }

  async saveInteractionResponse(response: Omit<UserInteractionResponse, 'id'>): Promise<APIResponse<UserInteractionResponse>> {
    try {
      const { data, error } = await this.supabase
        .from('user_interaction_responses')
        .upsert(response)
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Save Interaction Response Error:', error);
      return { error: error.message };
    }
  }

  // Storage Operations
  async uploadAudio(audioBuffer: ArrayBuffer, path: string): Promise<APIResponse<string>> {
    try {
      const { data, error } = await this.supabase.storage
        .from('lesson-audio')
        .upload(path, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        });

      if (error) throw error;

      const { data: { publicUrl } } = this.supabase.storage
        .from('lesson-audio')
        .getPublicUrl(path);

      return { data: publicUrl };
    } catch (error) {
      console.error('Upload Audio Error:', error);
      return { error: error.message };
    }
  }

  async downloadAudio(path: string): Promise<APIResponse<ArrayBuffer>> {
    try {
      const { data, error } = await this.supabase.storage
        .from('lesson-audio')
        .download(path);

      if (error) throw error;
      return { data: await data.arrayBuffer() };
    } catch (error) {
      console.error('Download Audio Error:', error);
      return { error: error.message };
    }
  }

  // Real-time Subscriptions
  subscribeToUserProgress(userId: string, callback: (payload: any) => void) {
    return this.supabase
      .channel(`user_progress_${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_progress',
        filter: `user_id=eq.${userId}`,
      }, callback)
      .subscribe();
  }

  subscribeToUserCourses(userId: string, callback: (payload: any) => void) {
    return this.supabase
      .channel(`user_courses_${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'courses',
        filter: `user_id=eq.${userId}`,
      }, callback)
      .subscribe();
  }

  // Offline Support
  async queueProgressUpdate(progress: Omit<UserProgress, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    try {
      const existingQueue = await AsyncStorage.getItem(STORAGE_KEYS.PROGRESS_QUEUE);
      const queue = existingQueue ? JSON.parse(existingQueue) : [];

      queue.push({
        ...progress,
        queued_at: new Date().toISOString(),
      });

      await AsyncStorage.setItem(STORAGE_KEYS.PROGRESS_QUEUE, JSON.stringify(queue));
    } catch (error) {
      console.error('Queue Progress Update Error:', error);
    }
  }

  async syncQueuedProgress(): Promise<{ success: number; failed: number }> {
    try {
      const queuedUpdates = await AsyncStorage.getItem(STORAGE_KEYS.PROGRESS_QUEUE);
      if (!queuedUpdates) return { success: 0, failed: 0 };

      const queue = JSON.parse(queuedUpdates);
      let success = 0;
      let failed = 0;

      for (const update of queue) {
        const { queued_at, ...progressData } = update;
        const result = await this.updateProgress(progressData);

        if (result.error) {
          failed++;
        } else {
          success++;
        }
      }

      // Clear the queue after processing
      if (success > 0) {
        await AsyncStorage.removeItem(STORAGE_KEYS.PROGRESS_QUEUE);
      }

      return { success, failed };
    } catch (error) {
      console.error('Sync Queued Progress Error:', error);
      return { success: 0, failed: 0 };
    }
  }

  // Health Check
  async healthCheck(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('subjects')
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Health Check Error:', error);
      return false;
    }
  }

  // Get Supabase client for direct access if needed
  getClient(): SupabaseClient {
    return this.supabase;
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();
