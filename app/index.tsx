import React, { useState } from 'react';
import { router } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { OnboardingFlow } from '../components/OnboardingFlow';
import { Subject } from '../types';

export default function Index() {
  const [showOnboarding, setShowOnboarding] = useState(true);

  const handleOnboardingComplete = (userId: string, selectedSubjects: Subject[]) => {
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
    backgroundColor: '#f8fafc',
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
  },
});
