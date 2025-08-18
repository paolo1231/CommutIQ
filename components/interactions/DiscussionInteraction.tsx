import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DiscussionContent, DiscussionResponse } from '../../types';

interface DiscussionInteractionProps {
  content: DiscussionContent;
  onSubmit: (response: DiscussionResponse) => void;
  onSkip?: () => void;
  isRequired?: boolean;
}

export const DiscussionInteraction: React.FC<DiscussionInteractionProps> = ({
  content,
  onSubmit,
  onSkip,
  isRequired = false,
}) => {
  const [thoughts, setThoughts] = useState('');
  const [selectedPoints, setSelectedPoints] = useState<string[]>([]);
  const [additionalQuestions, setAdditionalQuestions] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const togglePoint = (point: string) => {
    setSelectedPoints(prev =>
      prev.includes(point)
        ? prev.filter(p => p !== point)
        : [...prev, point]
    );
  };

  const handleSubmit = () => {
    if (thoughts.trim().length === 0 && selectedPoints.length === 0) {
      Alert.alert(
        'No Input',
        'Please share your thoughts or select discussion points before submitting.'
      );
      return;
    }

    const response: DiscussionResponse = {
      thoughts: thoughts.trim(),
      selected_points: selectedPoints,
      additional_questions: additionalQuestions.trim() 
        ? additionalQuestions.split('\n').filter(q => q.trim().length > 0)
        : undefined,
    };

    setSubmitted(true);
    setTimeout(() => {
      onSubmit(response);
    }, 1500);
  };

  const handleSkip = () => {
    if (!isRequired && onSkip) {
      Alert.alert(
        'Skip Discussion?',
        'Engaging with the material helps deepen your understanding. Are you sure you want to skip?',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Skip',
            onPress: () => onSkip(),
            style: 'destructive',
          },
        ]
      );
    }
  };

  const openResource = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open this resource');
    });
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="chatbubbles-outline" size={24} color="#10b981" />
          <Text style={styles.title}>Discussion Point</Text>
        </View>

        <View style={styles.topicContainer}>
          <Text style={styles.topicLabel}>Topic:</Text>
          <Text style={styles.topicText}>{content.topic}</Text>
        </View>

        {!submitted ? (
          <>
            {content.discussion_points.length > 0 && (
              <View style={styles.pointsContainer}>
                <Text style={styles.sectionTitle}>Select points you'd like to discuss:</Text>
                {content.discussion_points.map((point, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.discussionPoint,
                      selectedPoints.includes(point) && styles.discussionPointSelected
                    ]}
                    onPress={() => togglePoint(point)}
                  >
                    <View style={[
                      styles.checkbox,
                      selectedPoints.includes(point) && styles.checkboxSelected
                    ]}>
                      {selectedPoints.includes(point) && (
                        <Ionicons name="checkmark" size={16} color="white" />
                      )}
                    </View>
                    <Text style={[
                      styles.pointText,
                      selectedPoints.includes(point) && styles.pointTextSelected
                    ]}>
                      {point}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {content.starter_questions && content.starter_questions.length > 0 && (
              <View style={styles.questionsContainer}>
                <Text style={styles.sectionTitle}>Questions to consider:</Text>
                {content.starter_questions.map((question, index) => (
                  <View key={index} style={styles.starterQuestion}>
                    <Text style={styles.questionNumber}>{index + 1}.</Text>
                    <Text style={styles.questionText}>{question}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Share your thoughts:</Text>
              <TextInput
                style={styles.textInput}
                multiline
                placeholder="What are your initial thoughts on this topic?"
                placeholderTextColor="#9ca3af"
                value={thoughts}
                onChangeText={setThoughts}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Any questions you have? (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.questionsInput]}
                multiline
                placeholder="Enter each question on a new line..."
                placeholderTextColor="#9ca3af"
                value={additionalQuestions}
                onChangeText={setAdditionalQuestions}
                textAlignVertical="top"
              />
            </View>

            {content.resources && content.resources.length > 0 && (
              <View style={styles.resourcesContainer}>
                <Text style={styles.sectionTitle}>Additional Resources:</Text>
                {content.resources.map((resource, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.resource}
                    onPress={() => resource.url && openResource(resource.url)}
                    disabled={!resource.url}
                  >
                    <Ionicons 
                      name={resource.url ? "link-outline" : "document-text-outline"} 
                      size={20} 
                      color="#4f46e5" 
                    />
                    <View style={styles.resourceContent}>
                      <Text style={styles.resourceTitle}>{resource.title}</Text>
                      {resource.description && (
                        <Text style={styles.resourceDescription}>{resource.description}</Text>
                      )}
                    </View>
                    {resource.url && (
                      <Ionicons name="open-outline" size={16} color="#6b7280" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.submitButton,
                  (thoughts.trim().length === 0 && selectedPoints.length === 0) && styles.buttonDisabled
                ]}
                onPress={handleSubmit}
                disabled={thoughts.trim().length === 0 && selectedPoints.length === 0}
              >
                <Text style={styles.submitButtonText}>Submit Discussion</Text>
              </TouchableOpacity>
              {!isRequired && (
                <TouchableOpacity
                  style={[styles.button, styles.skipButton]}
                  onPress={handleSkip}
                >
                  <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          <View style={styles.submittedContainer}>
            <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            <Text style={styles.submittedTitle}>Discussion Submitted!</Text>
            <Text style={styles.submittedText}>
              Thank you for engaging with this topic. Your thoughts have been recorded.
            </Text>
            <View style={styles.submittedStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{selectedPoints.length}</Text>
                <Text style={styles.statLabel}>Points Selected</Text>
              </View>
              {additionalQuestions && (
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {additionalQuestions.split('\n').filter(q => q.trim()).length}
                  </Text>
                  <Text style={styles.statLabel}>Questions Asked</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  topicContainer: {
    backgroundColor: '#d1fae5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  topicLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 4,
  },
  topicText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#064e3b',
    fontWeight: '500',
  },
  pointsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  discussionPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  discussionPointSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#4f46e5',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  pointText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  pointTextSelected: {
    color: '#1e40af',
    fontWeight: '500',
  },
  questionsContainer: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  starterQuestion: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginRight: 8,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  questionsInput: {
    minHeight: 80,
  },
  resourcesContainer: {
    marginBottom: 20,
  },
  resource: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  resourceContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  resourceDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#10b981',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: '#f3f4f6',
  },
  skipButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  submittedContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  submittedTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#065f46',
    marginTop: 12,
    marginBottom: 8,
  },
  submittedText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  submittedStats: {
    flexDirection: 'row',
    gap: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#4f46e5',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
});
