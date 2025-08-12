import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabaseService } from '../services/supabaseService';
import { UserPreferences } from '../types';

interface OnboardingProps {
  userId: string;
  onComplete: (commuteTime: number) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ userId, onComplete }) => {
  const [commuteTime, setCommuteTime] = useState(30);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Create default user preferences
      const defaultPreferences: UserPreferences = {
        audioSpeed: 1.0,
        autoPlay: true,
        downloadQuality: 'standard',
        notificationsEnabled: true,
        backgroundPlayback: true,
      };

      // Update profile
      const result = await supabaseService.updateUserProfile(userId, {
        commute_time: commuteTime,
        subscription_tier: 'free',
        preferences: defaultPreferences,
        last_active_at: new Date().toISOString(),
      });

      if (result.error) {
        Alert.alert('Error', 'Failed to save your profile. Please try again.');
        return;
      }

      onComplete(commuteTime);
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <View style={styles.iconBackground}>
            <Ionicons name="car-outline" size={32} color="#4f46e5" />
          </View>
        </View>

        <Text style={styles.title}>Welcome to CommutIQ</Text>

        <Text style={styles.description}>
          Turn your daily commute into a productive learning experience. Let's
          start by understanding your commute time.
        </Text>

        <View style={styles.formContainer}>
          <Text style={styles.label}>
            How long is your daily commute (one way)?
          </Text>

          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={5}
              maximumValue={120}
              step={5}
              value={commuteTime}
              onValueChange={setCommuteTime}
              minimumTrackTintColor="#4f46e5"
              maximumTrackTintColor="#e5e7eb"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>5m</Text>
              <Text style={styles.sliderLabel}>60m</Text>
              <Text style={styles.sliderLabel}>120m</Text>
            </View>
          </View>

          <View style={styles.timeDisplay}>
            <Ionicons name="time-outline" size={16} color="#4f46e5" style={styles.timeIcon} />
            <Text style={styles.timeText}>{commuteTime} min</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          style={[styles.continueButton, loading && styles.continueButtonDisabled]}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBackground: {
    backgroundColor: '#eef2ff',
    padding: 16,
    borderRadius: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#1f2937',
  },
  description: {
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  formContainer: {
    marginBottom: 24,
  },
  label: {
    color: '#374151',
    fontWeight: '500',
    marginBottom: 16,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#4f46e5',
    width: 20,
    height: 20,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'center',
  },
  timeIcon: {
    marginRight: 4,
  },
  timeText: {
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  continueButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  continueButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
  continueButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
});
