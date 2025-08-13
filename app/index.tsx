import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { OnboardingFlow } from '../components/OnboardingFlow';
import { UI_CONFIG } from '../constants';
import { Subject } from '../types';

export default function Index() {
  const [showOnboarding, setShowOnboarding] = useState(true);

  const handleOnboardingComplete = (userId: string, selectedSubjects: Subject[]) => {
    console.log('Onboarding completed for user:', userId, 'with subjects:', selectedSubjects.length);
    setShowOnboarding(false);
    // Navigate to main dashboard
    router.replace('/dashboard');
  };

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Loading CommutIQ...</Text>
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
  text: {
    fontSize: UI_CONFIG.FONT_SIZES.LG,
    fontWeight: '600',
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
  },
});