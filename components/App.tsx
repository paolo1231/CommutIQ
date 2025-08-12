import React from 'react';
import { Layout } from './Layout';
import { View, Text, StyleSheet } from 'react-native';

// This component is now mainly for shared layout and context
// Individual screens are handled by Expo Router
export function App() {
  return (
    <Layout>
      <View style={styles.container}>
        <Text style={styles.text}>CommutIQ App</Text>
        <Text style={styles.subtext}>Using Expo Router Navigation</Text>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 16,
    color: '#6b7280',
  },
});
