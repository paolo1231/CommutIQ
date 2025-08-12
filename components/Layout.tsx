import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PricingModal } from './PricingModal';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [showPricing, setShowPricing] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4f46e5" />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoSection}>
            <Ionicons name="book-outline" size={24} color="white" style={styles.logoIcon} />
            <Text style={styles.logoText}>CommutIQ</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowPricing(true)}
            style={styles.upgradeButton}
          >
            <Ionicons name="star-outline" size={16} color="white" style={styles.upgradeIcon} />
            <Text style={styles.upgradeText}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.main}>
        {children}
      </View>
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    marginRight: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  upgradeIcon: {
    marginRight: 4,
  },
  upgradeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  main: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
});
