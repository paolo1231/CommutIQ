import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabaseService } from '../services/supabaseService';
import { Subject } from '../types';

interface SubjectSelectionProps {
  userId: string;
  commuteTime: number;
  onComplete: (selectedSubjects: Subject[]) => void;
}

export const SubjectSelection: React.FC<SubjectSelectionProps> = ({ userId, commuteTime, onComplete }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Icon mapping for subjects
  const getSubjectIcon = (name: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      'Languages': 'globe-outline',
      'Chess': 'extension-puzzle-outline',
      'History': 'library-outline',
      'Music Theory': 'musical-notes-outline',
      'Programming': 'code-slash-outline',
      'Literature': 'book-outline',
      'Science': 'flask-outline',
      'Mathematics': 'calculator-outline',
      'Philosophy': 'bulb-outline',
      'Art': 'brush-outline',
    };
    return iconMap[name] || 'book-outline';
  };

  // Color mapping for subjects
  const getSubjectColor = (name: string) => {
    const colorMap: Record<string, { background: string; text: string }> = {
      'Languages': { background: '#dbeafe', text: '#2563eb' },
      'Chess': { background: '#fef3c7', text: '#d97706' },
      'History': { background: '#d1fae5', text: '#059669' },
      'Music Theory': { background: '#e9d5ff', text: '#9333ea' },
      'Programming': { background: '#fee2e2', text: '#dc2626' },
      'Literature': { background: '#ccfbf1', text: '#0d9488' },
      'Science': { background: '#ecfdf5', text: '#10b981' },
      'Mathematics': { background: '#fef7ff', text: '#a855f7' },
      'Philosophy': { background: '#fff7ed', text: '#ea580c' },
      'Art': { background: '#f0f9ff', text: '#0ea5e9' },
    };
    return colorMap[name] || { background: '#f3f4f6', text: '#6b7280' };
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const result = await supabaseService.getAllSubjects();
      if (result.error) {
        Alert.alert('Error', 'Failed to load subjects. Please try again.');
        return;
      }
      setSubjects(result.data || []);
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (id: string) => {
    if (selectedSubjectIds.includes(id)) {
      setSelectedSubjectIds(selectedSubjectIds.filter(subjectId => subjectId !== id));
    } else {
      setSelectedSubjectIds([...selectedSubjectIds, id]);
    }
  };

  const handleContinue = async () => {
    if (selectedSubjectIds.length === 0) return;
    
    setSaving(true);
    try {
      // Save user subject selections
      const result = await supabaseService.saveUserSubjects(userId, selectedSubjectIds);
      if (result.error) {
        Alert.alert('Error', 'Failed to save your subject selections. Please try again.');
        return;
      }

      const selectedSubjects = subjects.filter(subject => selectedSubjectIds.includes(subject.id));
      onComplete(selectedSubjects);
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const screenWidth = Dimensions.get('window').width;
  const cardWidth = (screenWidth - 48) / 2; // 48 = padding (16) * 2 + gap (16)

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading subjects...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.title}>What would you like to learn?</Text>
        <Text style={styles.description}>
          Select subjects you're interested in learning during your {commuteTime}-minute commute. 
          We'll create personalized micro-lessons for you.
        </Text>

        <View style={styles.subjectsGrid}>
          {subjects.map(subject => {
            const isSelected = selectedSubjectIds.includes(subject.id);
            const colors = getSubjectColor(subject.name);
            const icon = getSubjectIcon(subject.name);
            
            return (
              <TouchableOpacity
                key={subject.id}
                style={[
                  styles.subjectCard,
                  { width: cardWidth },
                  isSelected ? styles.selectedCard : styles.unselectedCard
                ]}
                onPress={() => toggleSubject(subject.id)}
              >
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: colors.background }
                ]}>
                  <Ionicons 
                    name={icon} 
                    size={24} 
                    color={colors.text} 
                  />
                </View>
                <Text style={styles.subjectName}>{subject.name}</Text>
                {subject.is_premium && (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="star" size={12} color="#f59e0b" />
                    <Text style={styles.premiumText}>Premium</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={handleContinue}
          disabled={selectedSubjectIds.length === 0 || saving}
          style={[
            styles.continueButton,
            (selectedSubjectIds.length === 0 || saving) ? styles.disabledButton : styles.enabledButton
          ]}
        >
          {saving ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={[
              styles.continueButtonText,
              selectedSubjectIds.length === 0 ? styles.disabledButtonText : styles.enabledButtonText
            ]}>
              Create My Learning Plan
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1f2937',
  },
  description: {
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 32,
  },
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  subjectCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  selectedCard: {
    borderColor: '#4f46e5',
    backgroundColor: '#f8fafc',
  },
  unselectedCard: {
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  subjectName: {
    fontWeight: '500',
    color: '#374151',
  },
  continueButton: {
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 16,
  },
  enabledButton: {
    backgroundColor: '#4f46e5',
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
  },
  continueButtonText: {
    fontWeight: '500',
    fontSize: 16,
  },
  enabledButtonText: {
    color: 'white',
  },
  disabledButtonText: {
    color: '#6b7280',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  premiumText: {
    fontSize: 10,
    color: '#f59e0b',
    fontWeight: '600',
    marginLeft: 4,
  },
});
