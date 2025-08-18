import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

// Navigation utilities that work with Expo Router
export const AppNavigation = {
  // Navigate to different screens
  toOnboarding: () => router.replace('/onboarding'),
  toSubjectSelection: (commuteTime?: number) => {
    if (commuteTime) {
      router.push({
        pathname: '/subject-selection',
        params: { commuteTime }
      });
    } else {
      router.push('/subject-selection');
    }
  },
  toDashboard: () => router.replace('/dashboard'),
  toLesson: (lessonId: string, courseId?: string) => {
    console.log('Navigation toLesson called with:', { lessonId, courseId });
    
    if (!lessonId || lessonId === 'undefined' || lessonId === 'null') {
      console.error('Invalid lesson ID passed to navigation:', lessonId);
      return;
    }
    
    // Try using the direct path approach
    const path = `/lesson/${lessonId}`;
    const queryString = courseId ? `?courseId=${courseId}` : '';
    const fullPath = `${path}${queryString}`;
    
    console.log('Navigating to lesson with path:', fullPath);
    router.push(fullPath);
  },
  toCourse: (courseId: string) => {
    console.log('Navigation toCourse called with:', courseId);
    
    if (!courseId || courseId === 'undefined' || courseId === 'null') {
      console.error('Invalid course ID passed to navigation:', courseId);
      return;
    }
    
    // Use direct path
    const path = `/course/${courseId}`;
    console.log('Navigating to course with path:', path);
    router.push(path);
  },
  toPremium: () => router.push('/premium'),
  toSettings: () => router.push('/settings'),
  
  // Navigation actions
  goBack: () => router.back(),
  canGoBack: () => router.canGoBack(),
};

// Route management utilities
export const RouteManager = {
  // Check if user should see onboarding
  async shouldShowOnboarding(): Promise<boolean> {
    try {
      const onboardingComplete = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
      return !onboardingComplete;
    } catch {
      return true;
    }
  },
  
  // Mark onboarding as complete
  async completeOnboarding(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
    } catch (error) {
      console.error('Error marking onboarding complete:', error);
    }
  },
  
  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      return !!token;
    } catch {
      return false;
    }
  },
  
  // Get the appropriate initial route
  async getInitialRoute(): Promise<string> {
    try {
      const isAuth = await this.isAuthenticated();
      const shouldOnboard = await this.shouldShowOnboarding();
      
      if (!isAuth) {
        return '/auth';
      }
      
      if (shouldOnboard) {
        return '/onboarding';
      }
      
      return '/dashboard';
    } catch {
      return '/onboarding';
    }
  }
};

// Screen configuration for different app states
export const ScreenConfig = {
  onboarding: {
    headerShown: false,
    gestureEnabled: false,
  },
  subjectSelection: {
    headerShown: false,
    gestureEnabled: false,
  },
  dashboard: {
    headerShown: false,
    gestureEnabled: false,
  },
  lesson: {
    headerShown: true,
    headerTitle: 'Lesson',
    presentation: 'modal' as const,
  },
  premium: {
    headerShown: true,
    headerTitle: 'Go Premium',
    presentation: 'modal' as const,
  },
};

// Export utilities
export { router };
export default AppNavigation;
