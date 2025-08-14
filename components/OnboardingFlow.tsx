import { contentGenerationService } from '@/services/contentGenerationService';
import { freeUserContentService } from '@/services/freeUserContentService';
import { showErrorAlert } from '@/utils/alertHelper';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { UI_CONFIG } from '../constants';
import { supabaseService } from '../services/supabaseService';
import { Subject } from '../types';
import { AuthScreen } from './AuthScreen';
import { Layout } from './Layout';
import { Onboarding } from './Onboarding';
import { SubjectSelection } from './SubjectSelection';

interface OnboardingFlowProps {
  onComplete: (userId: string, selectedSubjects: Subject[]) => void;
}

type FlowStep = 'checking' | 'auth' | 'profile' | 'subjects' | 'generating';

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<FlowStep>('checking');
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [commuteTime, setCommuteTime] = useState(30);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, currentSubject: '' });

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const { user } = await supabaseService.getCurrentUser();

      if (user) {
        // User is authenticated, check if profile exists
        const profileResult = await supabaseService.getUserProfile(user.id);

        if (profileResult.data && !profileResult.error) {
          // Profile exists, check if subjects are selected
          const subjectsResult = await supabaseService.getUserSubjects(user.id);

          if (subjectsResult.data && subjectsResult.data.length > 0) {
            // User has completed onboarding, redirect to main app
            const selectedSubjects = subjectsResult.data
              .map(us => us.subject)
              .filter(s => s !== undefined) as Subject[];
            onComplete(user.id, selectedSubjects);
            return;
          } else {
            // Profile exists but no subjects selected
            setUserId(user.id);
            setUserProfile(profileResult.data);
            setCommuteTime(profileResult.data.commute_time);
            setCurrentStep('subjects');
            return;
          }
        } else {
          // User exists but no profile, need to complete profile setup
          setUserId(user.id);
          setCurrentStep('profile');
          return;
        }
      }

      // No authenticated user, show auth screen
      setCurrentStep('auth');
    } catch (error) {
      console.error('Auth check error:', error);
      setCurrentStep('auth');
    }
  };

  const handleAuthSuccess = (authenticatedUserId: string) => {
    setUserId(authenticatedUserId);
    setCurrentStep('profile');
  };

  const handleProfileComplete = async (userCommuteTime: number) => {
    setCommuteTime(userCommuteTime);

    // Fetch updated user profile to get subscription tier
    if (userId) {
      const profileResult = await supabaseService.getUserProfile(userId);
      if (profileResult.data) {
        setUserProfile(profileResult.data);
      }
    }

    setCurrentStep('subjects');
  };

  const handleSubjectsComplete = async (selectedSubjects: Subject[]) => {
    if (!userId) return;

    // Get user profile to check subscription tier
    const profile = userProfile || (await supabaseService.getUserProfile(userId)).data;
    if (!profile) {
      showErrorAlert('Unable to load user profile. Please try again.');
      return;
    }

    const isPremiumUser = profile.subscription_tier === 'premium';

    // Start content setup
    setCurrentStep('generating');
    setGenerationProgress({ current: 0, total: selectedSubjects.length, currentSubject: '' });

    try {
      if (isPremiumUser) {
        // Premium users: Generate personalized courses in real-time
        await handlePremiumUserSetup(selectedSubjects);
      } else {
        // Free users: Assign pre-generated courses
        await handleFreeUserSetup(selectedSubjects);
      }

      // Complete onboarding
      onComplete(userId, selectedSubjects);
    } catch (error) {
      console.error('Content setup failed:', error);
      const errorMessage = isPremiumUser
        ? 'We encountered an issue generating your personalized courses. Don\'t worry - you can still access your learning content, and we\'ll continue generating courses in the background.'
        : 'We encountered an issue setting up your courses. Don\'t worry - you can still access available courses from your dashboard.';

      showErrorAlert(errorMessage, () => onComplete(userId, selectedSubjects));
    }
  };

  const handlePremiumUserSetup = async (selectedSubjects: Subject[]) => {
    const generatedCourses = [];

    for (let i = 0; i < selectedSubjects.length; i++) {
      const subject = selectedSubjects[i];
      setGenerationProgress({
        current: i + 1,
        total: selectedSubjects.length,
        currentSubject: subject.name
      });

      try {
        console.log(`Generating personalized course for ${subject.name}...`);

        const course = await contentGenerationService.generateCourse({
          subject_id: subject.id,
          user_id: userId!,
          commute_time: commuteTime,
          difficulty: 'beginner',
        });

        generatedCourses.push(course);
        console.log(`Successfully generated course: ${course.title}`);
      } catch (error) {
        console.error(`Failed to generate course for ${subject.name}:`, error);

        // Try fallback generation
        try {
          console.log(`Attempting fallback generation for ${subject.name}...`);
          const fallbackCourse = await contentGenerationService.generateFallbackCourse(
            subject,
            commuteTime,
            userId!
          );
          generatedCourses.push(fallbackCourse);
          console.log(`Generated fallback course: ${fallbackCourse.title}`);
        } catch (fallbackError) {
          console.error(`Fallback generation also failed for ${subject.name}:`, fallbackError);
          // Continue with other subjects even if one fails
        }
      }
    }

    console.log(`Premium course generation complete. Generated ${generatedCourses.length} courses.`);
  };

  const handleFreeUserSetup = async (selectedSubjects: Subject[]) => {
    const assignedCourses = [];
    const subjectIds = selectedSubjects.map(s => s.id);

    // Get available pre-generated courses for the user's preferences
    const freeUserContent = await freeUserContentService.getAvailableCoursesForFreeUser(
      userId!,
      subjectIds,
      commuteTime,
      'beginner'
    );

    // Assign the best matching pre-generated course for each subject
    for (let i = 0; i < selectedSubjects.length; i++) {
      const subject = selectedSubjects[i];
      setGenerationProgress({
        current: i + 1,
        total: selectedSubjects.length,
        currentSubject: subject.name
      });

      try {
        // Find a pre-generated course for this subject
        const availableCourse = freeUserContent.preGenerated.find(
          course => course.subject_id === subject.id
        );

        if (availableCourse) {
          console.log(`Assigning pre-generated course for ${subject.name}...`);

          const userCourse = await freeUserContentService.enrollFreeUserInCourse(
            userId!,
            availableCourse.id
          );

          assignedCourses.push(userCourse);
          console.log(`Successfully assigned course: ${availableCourse.title}`);
        } else {
          console.log(`No pre-generated course available for ${subject.name}`);
          // Subject will still be saved in user_subjects, they can browse available courses later
        }
      } catch (error) {
        console.error(`Failed to assign course for ${subject.name}:`, error);
        // Continue with other subjects even if one fails
      }
    }

    console.log(`Free user setup complete. Assigned ${assignedCourses.length} courses.`);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'checking':
        return (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={UI_CONFIG.COLORS.PRIMARY} />
            <Text style={styles.loadingText}>Setting up your account...</Text>
          </View>
        );

      case 'auth':
        return <AuthScreen onAuthSuccess={handleAuthSuccess} />;

      case 'profile':
        return userId ? (
          <Layout>
            <Onboarding
              userId={userId}
              onComplete={handleProfileComplete}
            />
          </Layout>
        ) : null;

      case 'subjects':
        return userId ? (
          <Layout>
            <SubjectSelection
              userId={userId}
              commuteTime={commuteTime}
              onComplete={handleSubjectsComplete}
            />
          </Layout>
        ) : null;

      case 'generating':
        const isPremiumUser = userProfile?.subscription_tier === 'premium';

        return (
          <View style={styles.centerContainer}>
            <View style={styles.generationContainer}>
              <ActivityIndicator size="large" color={UI_CONFIG.COLORS.PRIMARY} />
              <Text style={styles.generationTitle}>
                {isPremiumUser ? 'Creating Your Learning Experience' : 'Setting Up Your Courses'}
              </Text>
              <Text style={styles.generationSubtitle}>
                {isPremiumUser
                  ? 'We\'re generating personalized courses just for you...'
                  : 'We\'re finding the best courses for your learning journey...'
                }
              </Text>

              {generationProgress.currentSubject && (
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>
                    {generationProgress.current} of {generationProgress.total}
                  </Text>
                  <Text style={styles.currentSubjectText}>
                    {isPremiumUser
                      ? `Generating ${generationProgress.currentSubject} course`
                      : `Setting up ${generationProgress.currentSubject} course`
                    }
                  </Text>
                </View>
              )}

              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(generationProgress.current / Math.max(generationProgress.total, 1)) * 100}%`
                    }
                  ]}
                />
              </View>

              {!isPremiumUser && (
                <View style={styles.freeUserNotice}>
                  <Text style={styles.freeUserNoticeText}>
                    💡 Upgrade to Premium for personalized AI-generated courses!
                  </Text>
                </View>
              )}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return <View style={styles.container}>{renderCurrentStep()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: UI_CONFIG.COLORS.BACKGROUND,
  },
  loadingText: {
    marginTop: UI_CONFIG.SPACING.MD,
    fontSize: UI_CONFIG.FONT_SIZES.MD,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
  },
  generationContainer: {
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.SPACING.XL,
    maxWidth: 400,
  },
  generationTitle: {
    fontSize: UI_CONFIG.FONT_SIZES.XL,
    fontWeight: 'bold',
    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginTop: UI_CONFIG.SPACING.LG,
    marginBottom: UI_CONFIG.SPACING.SM,
  },
  generationSubtitle: {
    fontSize: UI_CONFIG.FONT_SIZES.MD,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: UI_CONFIG.SPACING.XL,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: UI_CONFIG.SPACING.LG,
  },
  progressText: {
    fontSize: UI_CONFIG.FONT_SIZES.SM,
    fontWeight: '600',
    color: UI_CONFIG.COLORS.PRIMARY,
    marginBottom: UI_CONFIG.SPACING.XS,
  },
  currentSubjectText: {
    fontSize: UI_CONFIG.FONT_SIZES.SM,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: UI_CONFIG.COLORS.GRAY_200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: UI_CONFIG.COLORS.PRIMARY,
    borderRadius: 3,
  },
  freeUserNotice: {
    marginTop: UI_CONFIG.SPACING.LG,
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingVertical: UI_CONFIG.SPACING.SM,
    backgroundColor: UI_CONFIG.COLORS.GRAY_100,
    borderRadius: UI_CONFIG.BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: UI_CONFIG.COLORS.GRAY_200,
  },
  freeUserNoticeText: {
    fontSize: UI_CONFIG.FONT_SIZES.SM,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
  },
});