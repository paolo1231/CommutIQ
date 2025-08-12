import { supabaseService } from './supabaseService';
import { SUBJECTS_CONFIG } from '../constants';
import { Subject } from '../types';
import { debugLog, debugError } from '../utils';

/**
 * DatabaseService handles database initialization, migrations, and setup
 */
export class DatabaseService {
  /**
   * Initialize the database with required data
   */
  async initializeDatabase(): Promise<boolean> {
    try {
      debugLog('Initializing database...');

      // Check if database is already initialized
      const isInitialized = await this.isDatabaseInitialized();
      if (isInitialized) {
        debugLog('Database already initialized');
        return true;
      }

      // Initialize subjects
      await this.initializeSubjects();

      debugLog('Database initialization complete');
      return true;
    } catch (error) {
      debugError('Database initialization failed', error);
      return false;
    }
  }

  /**
   * Check if database is already initialized
   */
  private async isDatabaseInitialized(): Promise<boolean> {
    try {
      const { data, error } = await supabaseService.getClient()
        .from('subjects')
        .select('id')
        .limit(1);

      return !error && data && data.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Initialize subjects from configuration
   */
  private async initializeSubjects(): Promise<void> {
    try {
      debugLog('Initializing subjects...');

      const subjects = SUBJECTS_CONFIG.map(subject => ({
        name: subject.name,
        icon: subject.icon,
        color: JSON.stringify(subject.color),
        category: subject.category,
        is_premium: subject.is_premium,
      }));

      const { error } = await supabaseService.getClient()
        .from('subjects')
        .upsert(subjects, { onConflict: 'name' });

      if (error) {
        throw error;
      }

      debugLog(`Initialized ${subjects.length} subjects`);
    } catch (error) {
      debugError('Failed to initialize subjects', error);
      throw error;
    }
  }

  /**
   * Create user profile with default preferences
   */
  async createUserProfile(userId: string, data: {
    commuteTime: number;
    subscriptionTier?: 'free' | 'premium';
  }): Promise<boolean> {
    try {
      const profileData = {
        id: userId,
        commute_time: data.commuteTime,
        subscription_tier: data.subscriptionTier || 'free',
        preferences: {
          audioSpeed: 1.0,
          autoPlay: true,
          downloadQuality: 'standard',
          notificationsEnabled: true,
          backgroundPlayback: true,
        },
      };

      const { error } = await supabaseService.getClient()
        .from('user_profiles')
        .upsert(profileData);

      if (error) {
        throw error;
      }

      debugLog(`Created user profile for ${userId}`);
      return true;
    } catch (error) {
      debugError('Failed to create user profile', error);
      return false;
    }
  }

  /**
   * Save user subject selections with priorities
   */
  async saveUserSubjects(userId: string, subjects: Subject[]): Promise<boolean> {
    try {
      // First, clear existing selections
      await supabaseService.getClient()
        .from('user_subjects')
        .delete()
        .eq('user_id', userId);

      if (subjects.length === 0) {
        return true;
      }

      // Insert new selections with priorities
      const userSubjects = subjects.map((subject, index) => ({
        user_id: userId,
        subject_id: subject.id,
        priority: index + 1,
      }));

      const { error } = await supabaseService.getClient()
        .from('user_subjects')
        .insert(userSubjects);

      if (error) {
        throw error;
      }

      debugLog(`Saved ${subjects.length} subject selections for user ${userId}`);
      return true;
    } catch (error) {
      debugError('Failed to save user subjects', error);
      return false;
    }
  }

  /**
   * Get comprehensive user data
   */
  async getUserData(userId: string) {
    try {
      // Get user profile
      const { data: profile, error: profileError } = await supabaseService.getClient()
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        throw profileError;
      }

      // Get user subjects with subject details
      const { data: userSubjects, error: subjectsError } = await supabaseService.getClient()
        .from('user_subjects')
        .select(`
          *,
          subject:subjects(*)
        `)
        .eq('user_id', userId)
        .order('priority');

      if (subjectsError) {
        throw subjectsError;
      }

      // Get user courses
      const { data: courses, error: coursesError } = await supabaseService.getClient()
        .from('courses')
        .select(`
          *,
          subject:subjects(*),
          lessons(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (coursesError) {
        throw coursesError;
      }

      // Get user progress
      const { data: progress, error: progressError } = await supabaseService.getClient()
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (progressError) {
        throw progressError;
      }

      return {
        profile,
        subjects: userSubjects,
        courses: courses || [],
        progress: progress || [],
      };
    } catch (error) {
      debugError('Failed to get user data', error);
      throw error;
    }
  }

  /**
   * Update user activity timestamp
   */
  async updateUserActivity(userId: string): Promise<void> {
    try {
      const { error } = await supabaseService.getClient()
        .from('user_profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      debugError('Failed to update user activity', error);
    }
  }

  /**
   * Get database health status
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    tables: Record<string, boolean>;
    timestamp: string;
  }> {
    const tables = [
      'user_profiles',
      'subjects', 
      'user_subjects',
      'courses',
      'lessons',
      'user_progress',
      'lesson_interactions',
      'user_interaction_responses'
    ];

    const tableStatus: Record<string, boolean> = {};
    let allHealthy = true;

    for (const table of tables) {
      try {
        const { error } = await supabaseService.getClient()
          .from(table)
          .select('id')
          .limit(1);
        
        tableStatus[table] = !error;
        if (error) allHealthy = false;
      } catch {
        tableStatus[table] = false;
        allHealthy = false;
      }
    }

    return {
      healthy: allHealthy,
      tables: tableStatus,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create sample course for testing
   */
  async createSampleCourse(userId: string, subjectId: string): Promise<string | null> {
    try {
      // Create course
      const { data: course, error: courseError } = await supabaseService.getClient()
        .from('courses')
        .insert({
          title: 'Introduction to Programming',
          subject_id: subjectId,
          user_id: userId,
          total_lessons: 3,
          estimated_duration: 45,
          difficulty: 'beginner',
          is_premium: false,
        })
        .select()
        .single();

      if (courseError) {
        throw courseError;
      }

      // Create sample lessons
      const lessons = [
        {
          course_id: course.id,
          title: 'What is Programming?',
          content: 'An introduction to programming concepts and why programming is important.',
          duration: 15,
          transcript: 'Welcome to your first programming lesson. Today we will explore what programming is...',
          lesson_order: 1,
        },
        {
          course_id: course.id,
          title: 'Programming Languages',
          content: 'Overview of different programming languages and their uses.',
          duration: 15,
          transcript: 'In this lesson, we will learn about different programming languages...',
          lesson_order: 2,
        },
        {
          course_id: course.id,
          title: 'Your First Program',
          content: 'Writing and running your very first program.',
          duration: 15,
          transcript: 'Let\s write our first program together. We will start with...',
          lesson_order: 3,
        },
      ];

      const { error: lessonsError } = await supabaseService.getClient()
        .from('lessons')
        .insert(lessons);

      if (lessonsError) {
        throw lessonsError;
      }

      debugLog(`Created sample course ${course.id} for user ${userId}`);
      return course.id;
    } catch (error) {
      debugError('Failed to create sample course', error);
      return null;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(userId?: string): Promise<any> {
    try {
      const { data, error } = await supabaseService.getClient()
        .rpc('get_storage_stats', { user_id: userId || null });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      debugError('Failed to get storage stats', error);
      return null;
    }
  }

  /**
   * Cleanup old storage files
   */
  async cleanupOldFiles(bucketName: string, olderThanDays: number = 30): Promise<number> {
    try {
      const { data, error } = await supabaseService.getClient()
        .rpc('cleanup_old_storage_files', {
          bucket_name: bucketName,
          older_than_days: olderThanDays,
        });

      if (error) {
        throw error;
      }

      debugLog(`Cleaned up ${data} old files from ${bucketName}`);
      return data || 0;
    } catch (error) {
      debugError('Failed to cleanup old files', error);
      return 0;
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
