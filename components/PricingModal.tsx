import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PricingModalProps {
  onClose: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ onClose }) => {
  const features = [
    {
      text: 'Access to curated learning plans designed by education experts',
      highlight: 'curated learning plans'
    },
    {
      text: 'Earn certificates to showcase your knowledge',
      highlight: 'certificates'
    },
    {
      text: 'Exclusive partner content from leading educators',
      highlight: 'partner content'
    },
    {
      text: 'Unlimited access to all subjects and advanced lessons',
      highlight: 'all subjects'
    },
    {
      text: 'Ad-free learning experience',
      highlight: 'Ad-free'
    }
  ];

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Upgrade to Premium</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-outline" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.iconContainer}>
              <View style={styles.iconBackground}>
                <Ionicons name="star-outline" size={32} color="#f59e0b" />
              </View>
            </View>

            <View style={styles.pricingContainer}>
              <View style={styles.priceDisplay}>
                <Text style={styles.price}>$7.99</Text>
                <Text style={styles.period}>/month</Text>
              </View>
              <Text style={styles.cancelNote}>Cancel anytime</Text>
            </View>

            <View style={styles.featuresContainer}>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons 
                    name="checkmark-outline" 
                    size={20} 
                    color="#10b981" 
                    style={styles.checkIcon} 
                  />
                  <Text style={styles.featureText}>
                    {feature.text.split(feature.highlight)[0]}
                    <Text style={styles.featureHighlight}>{feature.highlight}</Text>
                    {feature.text.split(feature.highlight)[1]}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.upgradeButton}>
              <Text style={styles.upgradeButtonText}>Start 7-Day Free Trial</Text>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              By upgrading, you agree to our Terms of Service and Privacy Policy.
              Your subscription will automatically renew each month until canceled.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 8,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBackground: {
    backgroundColor: '#fef3c7',
    borderRadius: 32,
    padding: 16,
  },
  pricingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  priceDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  price: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  period: {
    fontSize: 18,
    color: '#6b7280',
    marginLeft: 4,
  },
  cancelNote: {
    color: '#6b7280',
    fontSize: 14,
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    color: '#374151',
    lineHeight: 20,
  },
  featureHighlight: {
    fontWeight: '600',
    color: '#374151',
  },
  upgradeButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 16,
  },
  upgradeButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
  disclaimer: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
  },
});
