import React from 'react';
import { OnboardingFlow } from '../components/OnboardingFlow';
import { router } from 'expo-router';
import { Subject } from '../types';

export default function AuthScreen() {
  const handleComplete = (userId: string, selectedSubjects: Subject[]) => {
    router.replace('/dashboard');
  };

  return <OnboardingFlow onComplete={handleComplete} />;
}
