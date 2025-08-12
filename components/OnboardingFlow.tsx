import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { AuthScreen } from './AuthScreen';
import { Onboarding } from './Onboarding';
import { SubjectSelection } from './SubjectSelection';
import { Layout } from './Layout';
import { supabaseService } from '../services/supabaseService';
import { Subject } from '../types';

interface OnboardingFlowProps {
  onComplete: (userId: string, selectedSubjects: Subject[]) => void;
}

type FlowStep = 'checking' | 'auth' | 'profile' | 'subjects';

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<FlowStep>('checking');
  const [userId, setUserId] = useState<string | null>(null);
  const [commuteTime, setCommuteTime] = useState(30);

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

  const handleSubjectsComplete = (selectedSubjects: Subject[]) => {
    if (userId) {
      onComplete(userId, selectedSubjects);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'checking':
        return (
          <View style={styles.centerContainer}>
            {/* Could add a loading spinner here */}
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
    backgroundColor: '#f8fafc',
  },
});
