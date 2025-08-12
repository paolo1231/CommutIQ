import { contentGenerationService } from '@/services/contentGenerationService';
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

  const handleProfileComplete = (userCommuteTime: number) => {
    setCommuteTime(userCommuteTime);
    setCurrentStep('subjects');
  };

  const handleSubjectsComplete = async (selectedSubjects: Subject[]) => {
    if (!userId) return;

    // Start content generation
    setCurrentStep('generating');
    setGenerationProgress({ current: 0, total: selectedSubjects.length, currentSubject: '' });

    try {
      const generatedCourses = [];

      for (let i = 0; i < selectedSubjects.length; i++) {
        const subject = selectedSubjects[i];
        setGenerationProgress({
          current: i + 1,
          total: selectedSubjects.length,
          currentSubject: subject.name
        });

        try {
          console.log(`Generating course for ${subject.name}...`);

          const course = await contentGenerationService.generateCourse({
            subject_id: subject.id,
            user_id: userId,
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
              userId
            );
            generatedCourses.push(fallbackCourse);
            console.log(`Generated fallback course: ${fallbackCourse.title}`);
          } catch (fallbackError) {
            console.error(`Fallback generation also failed for ${subject.name}:`, fallbackError);
            // Continue with other subjects even if one fails
          }
        }
      }

      console.log(`Content generation complete. Generated ${generatedCourses.length} courses.`);

      // Complete onboarding
      onComplete(userId, selectedSubjects);
    } catch (error) {
      console.error('Content generation failed:', error);
      showErrorAlert(
        'We encountered an issue generating your courses. Don\'t worry - you can still access your learning content, and we\'ll continue generating courses in the background.',
        () => onComplete(userId, selectedSubjects)
      );
    }
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
        return (
          <View style={styles.centerContainer}>
            <View style={styles.generationContainer}>
              <ActivityIndicator size="large" color={UI_CONFIG.COLORS.PRIMARY} />
              <Text style={styles.generationTitle}>Creating Your Learning Experience</Text>
              <Text style={styles.generationSubtitle}>
                We're generating personalized courses just for you...
              </Text>

              {generationProgress.currentSubject && (
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>
                    {generationProgress.current} of {generationProgress.total}
                  </Text>
                  <Text style={styles.currentSubjectText}>
                    Generating {generationProgress.currentSubject} course
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
});