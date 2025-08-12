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
  toLesson: (lessonId: string, courseId: string) => {
    router.push({
      pathname: '/lesson',
      params: { lessonId, courseId }
    });
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
