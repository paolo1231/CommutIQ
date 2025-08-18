import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingFlow } from '../components/OnboardingFlow';
import { UI_CONFIG } from '../constants';
import { Subject } from '../types';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    try {
      // Check if user has completed onboarding
      const onboardingComplete = await AsyncStorage.getItem('onboardingComplete');
      const userId = await AsyncStorage.getItem('userId');
      
      if (onboardingComplete === 'true' && userId) {
        // User has completed onboarding, go to dashboard
        router.replace('/dashboard');
      } else {
        // User needs to complete onboarding
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      // Default to showing onboarding on error
      setShowOnboarding(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = async (userId: string, selectedSubjects: Subject[]) => {
    console.log('Onboarding completed for user:', userId, 'with subjects:', selectedSubjects.length);
    
    try {
      // Save onboarding status and user data
      await AsyncStorage.setItem('onboardingComplete', 'true');
      await AsyncStorage.setItem('userId', userId);
      await AsyncStorage.setItem('selectedSubjects', JSON.stringify(selectedSubjects));
      
      // Navigate to main dashboard
      router.replace('/dashboard');
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={UI_CONFIG.COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Loading CommutIQ...</Text>
      </View>
    );
  }

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  // This shouldn't normally be reached as we redirect in checkUserStatus
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={UI_CONFIG.COLORS.PRIMARY} />
      <Text style={styles.loadingText}>Redirecting...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: UI_CONFIG.COLORS.BACKGROUND,
  },
  loadingText: {
    marginTop: UI_CONFIG.SPACING.MD,
    fontSize: UI_CONFIG.FONT_SIZES.LG,
    fontWeight: '600',
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
  },
});
