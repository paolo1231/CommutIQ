import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReflectionContent, ReflectionResponse } from '../../types';

interface ReflectionInteractionProps {
  content: ReflectionContent;
  onSubmit: (response: ReflectionResponse) => void;
  onSkip?: () => void;
  isRequired?: boolean;
}

export const ReflectionInteraction: React.FC<ReflectionInteractionProps> = ({
  content,
  onSubmit,
  onSkip,
  isRequired = false,
}) => {
  const [responseText, setResponseText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const wordCount = responseText.trim().split(/\s+/).filter(word => word.length > 0).length;
  const minWords = content.suggested_response_length || 50;
  const isValidLength = wordCount >= minWords * 0.8; // Allow 80% of suggested length

  const handleSubmit = () => {
    if (responseText.trim().length === 0) {
      Alert.alert('Empty Response', 'Please write your reflection before submitting.');
      return;
    }

    if (!isValidLength && content.suggested_response_length) {
      Alert.alert(
        'Response Too Short',
        `Your reflection should be at least ${Math.floor(minWords * 0.8)} words. Current: ${wordCount} words.`,
        [
          { text: 'Continue Writing', style: 'cancel' },
          {
            text: 'Submit Anyway',
            onPress: () => submitResponse(),
            style: 'destructive',
          },
        ]
      );
      return;
    }

    submitResponse();
  };

  const submitResponse = () => {
    const response: ReflectionResponse = {
      text: responseText.trim(),
      word_count: wordCount,
    };

    setSubmitted(true);
    setTimeout(() => {
      onSubmit(response);
    }, 1500);
  };

  const handleSkip = () => {
    if (!isRequired && onSkip) {
      Alert.alert(
        'Skip Reflection?',
        'Taking time to reflect helps reinforce your learning. Are you sure you want to skip?',
        [
          { text: 'Keep Writing', style: 'cancel' },
          {
            text: 'Skip',
            onPress: () => onSkip(),
            style: 'destructive',
          },
        ]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingView}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Ionicons name="bulb-outline" size={24} color="#f59e0b" />
            <Text style={styles.title}>Reflection Moment</Text>
          </View>

          <View style={styles.promptContainer}>
            <Text style={styles.prompt}>{content.prompt}</Text>
          </View>

          {content.guidance_points && content.guidance_points.length > 0 && (
            <View style={styles.guidanceContainer}>
              <Text style={styles.guidanceTitle}>Consider these points:</Text>
              {content.guidance_points.map((point, index) => (
                <View key={index} style={styles.guidancePoint}>
                  <Text style={styles.guidanceBullet}>•</Text>
                  <Text style={styles.guidanceText}>{point}</Text>
                </View>
              ))}
            </View>
          )}

          {!submitted ? (
            <>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  multiline
                  placeholder="Share your thoughts..."
                  placeholderTextColor="#9ca3af"
                  value={responseText}
                  onChangeText={setResponseText}
                  textAlignVertical="top"
                  editable={!submitted}
                />
                <View style={styles.wordCountContainer}>
                  <Text style={[
                    styles.wordCount,
                    !isValidLength && styles.wordCountWarning
                  ]}>
                    {wordCount} words
                    {content.suggested_response_length && 
                      ` (suggested: ${content.suggested_response_length})`}
                  </Text>
                </View>
              </View>

              {content.example_response && (
                <TouchableOpacity
                  style={styles.exampleContainer}
                  onPress={() => Alert.alert(
                    'Example Response',
                    content.example_response,
                    [{ text: 'OK' }]
                  )}
                >
                  <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
                  <Text style={styles.exampleText}>View example response</Text>
                </TouchableOpacity>
              )}

              <View style={styles.footer}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.submitButton,
                    responseText.trim().length === 0 && styles.buttonDisabled
                  ]}
                  onPress={handleSubmit}
                  disabled={responseText.trim().length === 0}
                >
                  <Text style={styles.submitButtonText}>Submit Reflection</Text>
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
              <Text style={styles.submittedTitle}>Reflection Submitted!</Text>
              <Text style={styles.submittedText}>
                Thank you for taking the time to reflect on this topic.
              </Text>
              <View style={styles.submittedStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{wordCount}</Text>
                  <Text style={styles.statLabel}>Words Written</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
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
  promptContainer: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  prompt: {
    fontSize: 16,
    lineHeight: 24,
    color: '#78350f',
    fontWeight: '500',
  },
  guidanceContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  guidanceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  guidancePoint: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  guidanceBullet: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  guidanceText: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    minHeight: 150,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  wordCountContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  wordCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  wordCountWarning: {
    color: '#f59e0b',
  },
  exampleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  exampleText: {
    fontSize: 14,
    color: '#6b7280',
    textDecorationLine: 'underline',
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
    backgroundColor: '#f59e0b',
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
