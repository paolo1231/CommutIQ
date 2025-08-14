import { showErrorAlert } from '@/utils/alertHelper';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { UI_CONFIG } from '../constants';
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
        preferences: defaultPreferences,
        last_active_at: new Date().toISOString(),
      });

      if (result.error) {
        showErrorAlert('Failed to save your profile. Please try again.');
        return;
      }

      onComplete(commuteTime);
    } catch (error) {
      showErrorAlert('Something went wrong. Please try again.');
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

          <View style={styles.timeSelector}>
            <View style={styles.timeDisplay}>
              <Ionicons name="time-outline" size={20} color={UI_CONFIG.COLORS.PRIMARY} style={styles.timeIcon} />
              <Text style={styles.timeText}>{commuteTime} minutes</Text>
            </View>

            <View style={styles.timeControls}>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setCommuteTime(Math.max(5, commuteTime - 5))}
                disabled={commuteTime <= 5}
              >
                <Ionicons name="remove" size={20} color={commuteTime <= 5 ? UI_CONFIG.COLORS.GRAY_400 : UI_CONFIG.COLORS.PRIMARY} />
              </TouchableOpacity>

              <View style={styles.timeRange}>
                <Text style={styles.rangeText}>5 - 120 min</Text>
              </View>

              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setCommuteTime(Math.min(120, commuteTime + 5))}
                disabled={commuteTime >= 120}
              >
                <Ionicons name="add" size={20} color={commuteTime >= 120 ? UI_CONFIG.COLORS.GRAY_400 : UI_CONFIG.COLORS.PRIMARY} />
              </TouchableOpacity>
            </View>

            <View style={styles.quickOptions}>
              <Text style={styles.quickOptionsLabel}>Quick select:</Text>
              <View style={styles.quickButtons}>
                {[15, 30, 45, 60].map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.quickButton,
                      commuteTime === time && styles.quickButtonActive
                    ]}
                    onPress={() => setCommuteTime(time)}
                  >
                    <Text style={[
                      styles.quickButtonText,
                      commuteTime === time && styles.quickButtonTextActive
                    ]}>
                      {time}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
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
    paddingHorizontal: UI_CONFIG.SPACING.LG,
    backgroundColor: UI_CONFIG.COLORS.BACKGROUND,
  },
  card: {
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
    borderRadius: UI_CONFIG.BORDER_RADIUS.LG,
    padding: UI_CONFIG.SPACING.XL,
    ...UI_CONFIG.SHADOWS.MD,
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: UI_CONFIG.SPACING.XL,
  },
  iconBackground: {
    backgroundColor: '#eef2ff',
    padding: UI_CONFIG.SPACING.LG,
    borderRadius: UI_CONFIG.BORDER_RADIUS.FULL,
  },
  title: {
    fontSize: UI_CONFIG.FONT_SIZES.XXL,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: UI_CONFIG.SPACING.XL,
    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
  },
  description: {
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: UI_CONFIG.SPACING.XXL,
    fontSize: UI_CONFIG.FONT_SIZES.MD,
  },
  formContainer: {
    marginBottom: UI_CONFIG.SPACING.XL,
  },
  label: {
    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
    fontWeight: '600',
    marginBottom: UI_CONFIG.SPACING.LG,
    fontSize: UI_CONFIG.FONT_SIZES.MD,
  },
  timeSelector: {
    alignItems: 'center',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: UI_CONFIG.SPACING.LG,
    paddingVertical: UI_CONFIG.SPACING.MD,
    borderRadius: UI_CONFIG.BORDER_RADIUS.LG,
    marginBottom: UI_CONFIG.SPACING.LG,
  },
  timeIcon: {
    marginRight: UI_CONFIG.SPACING.SM,
  },
  timeText: {
    fontWeight: 'bold',
    color: UI_CONFIG.COLORS.PRIMARY,
    fontSize: UI_CONFIG.FONT_SIZES.LG,
  },
  timeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: UI_CONFIG.SPACING.LG,
  },
  timeButton: {
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
    borderWidth: 2,
    borderColor: UI_CONFIG.COLORS.GRAY_200,
    borderRadius: UI_CONFIG.BORDER_RADIUS.LG,
    padding: UI_CONFIG.SPACING.SM,
    marginHorizontal: UI_CONFIG.SPACING.SM,
  },
  timeRange: {
    paddingHorizontal: UI_CONFIG.SPACING.LG,
  },
  rangeText: {
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    fontSize: UI_CONFIG.FONT_SIZES.SM,
  },
  quickOptions: {
    alignItems: 'center',
  },
  quickOptionsLabel: {
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    fontSize: UI_CONFIG.FONT_SIZES.SM,
    marginBottom: UI_CONFIG.SPACING.SM,
  },
  quickButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  quickButton: {
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
    borderWidth: 2,
    borderColor: UI_CONFIG.COLORS.GRAY_200,
    borderRadius: UI_CONFIG.BORDER_RADIUS.MD,
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingVertical: UI_CONFIG.SPACING.SM,
    margin: UI_CONFIG.SPACING.XS,
  },
  quickButtonActive: {
    backgroundColor: UI_CONFIG.COLORS.PRIMARY,
    borderColor: UI_CONFIG.COLORS.PRIMARY,
  },
  quickButtonText: {
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    fontSize: UI_CONFIG.FONT_SIZES.SM,
    fontWeight: '500',
  },
  quickButtonTextActive: {
    color: UI_CONFIG.COLORS.TEXT_ON_PRIMARY,
  },
  continueButton: {
    backgroundColor: UI_CONFIG.COLORS.PRIMARY,
    paddingVertical: UI_CONFIG.SPACING.MD,
    borderRadius: UI_CONFIG.BORDER_RADIUS.LG,
    alignItems: 'center',
    ...UI_CONFIG.SHADOWS.SM,
  },
  continueButtonText: {
    color: UI_CONFIG.COLORS.TEXT_ON_PRIMARY,
    fontWeight: '600',
    fontSize: UI_CONFIG.FONT_SIZES.MD,
  },
  continueButtonDisabled: {
    backgroundColor: UI_CONFIG.COLORS.GRAY_400,
  },
});
