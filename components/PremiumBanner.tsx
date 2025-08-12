import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PricingModal } from './PricingModal';

export const PremiumBanner: React.FC = () => {
  const [showPricing, setShowPricing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <>
      <LinearGradient
        colors={['#f59e0b', '#d97706']}
        style={styles.banner}
      >
        <TouchableOpacity
          onPress={() => setDismissed(true)}
          style={styles.closeButton}
        >
          <Ionicons name="close-outline" size={16} color="rgba(255, 255, 255, 0.8)" />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="star-outline" size={24} color="white" />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.title}>Upgrade to CommutIQ Premium</Text>
            <Text style={styles.description}>
              Get access to expert-curated learning plans, certifications, and
              exclusive partner content.
            </Text>
            
            <TouchableOpacity
              onPress={() => setShowPricing(true)}
              style={styles.upgradeButton}
            >
              <Text style={styles.upgradeButtonText}>Upgrade for $7.99/month</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
      
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
    </>
  );
};

const styles = StyleSheet.create({
  banner: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
    padding: 12,
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 12,
  },
  upgradeButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  upgradeButtonText: {
    color: '#d97706',
    fontWeight: '600',
    fontSize: 14,
  },
});
