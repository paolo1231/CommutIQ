import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QuizContent, QuizResponse } from '../../types';

interface QuizInteractionProps {
  content: QuizContent;
  onSubmit: (response: QuizResponse) => void;
  onSkip?: () => void;
  isRequired?: boolean;
}

export const QuizInteraction: React.FC<QuizInteractionProps> = ({
  content,
  onSubmit,
  onSkip,
  isRequired = false,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleOptionSelect = (index: number) => {
    if (!submitted) {
      setSelectedIndex(index);
    }
  };

  const handleSubmit = () => {
    if (selectedIndex === null) {
      Alert.alert('Please select an answer', 'You must choose an option before submitting.');
      return;
    }

    const isCorrect = selectedIndex === content.correct_answer_index;
    const response: QuizResponse = {
      selected_option_id: content.options[selectedIndex].id,
      selected_option_index: selectedIndex,
      is_correct: isCorrect,
      time_taken_seconds: timeElapsed,
    };

    setSubmitted(true);
    setShowExplanation(true);
    
    // Auto-advance after showing result
    setTimeout(() => {
      onSubmit(response);
    }, isCorrect ? 2000 : 3000);
  };

  const handleSkip = () => {
    if (!isRequired && onSkip) {
      Alert.alert(
        'Skip Question?',
        'Are you sure you want to skip this question?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Skip', 
            onPress: () => onSkip(),
            style: 'destructive'
          },
        ]
      );
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="help-circle" size={24} color="#4f46e5" />
          <Text style={styles.title}>Quiz Question</Text>
        </View>
        {content.time_limit_seconds && (
          <View style={styles.timer}>
            <Ionicons name="timer-outline" size={20} color="#6b7280" />
            <Text style={styles.timerText}>{formatTime(timeElapsed)}</Text>
          </View>
        )}
      </View>

      <View style={styles.questionContainer}>
        <Text style={styles.question}>{content.question}</Text>
      </View>

      <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
        {content.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrect = index === content.correct_answer_index;
          const showResult = submitted && (isSelected || isCorrect);

          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.option,
                isSelected && !submitted && styles.optionSelected,
                showResult && isCorrect && styles.optionCorrect,
                showResult && isSelected && !isCorrect && styles.optionIncorrect,
              ]}
              onPress={() => handleOptionSelect(index)}
              disabled={submitted}
            >
              <View style={styles.optionContent}>
                <View style={[
                  styles.optionIndicator,
                  isSelected && !submitted && styles.optionIndicatorSelected,
                  showResult && isCorrect && styles.optionIndicatorCorrect,
                  showResult && isSelected && !isCorrect && styles.optionIndicatorIncorrect,
                ]}>
                  {!submitted ? (
                    <Text style={styles.optionLetter}>{String.fromCharCode(65 + index)}</Text>
                  ) : showResult && isCorrect ? (
                    <Ionicons name="checkmark" size={18} color="white" />
                  ) : showResult && isSelected && !isCorrect ? (
                    <Ionicons name="close" size={18} color="white" />
                  ) : (
                    <Text style={styles.optionLetter}>{String.fromCharCode(65 + index)}</Text>
                  )}
                </View>
                <Text style={[
                  styles.optionText,
                  isSelected && !submitted && styles.optionTextSelected,
                  showResult && isCorrect && styles.optionTextCorrect,
                  showResult && isSelected && !isCorrect && styles.optionTextIncorrect,
                ]}>
                  {option.text}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {showExplanation && content.explanation && (
        <View style={styles.explanationContainer}>
          <View style={styles.explanationHeader}>
            <Ionicons 
              name={selectedIndex === content.correct_answer_index ? "checkmark-circle" : "information-circle"} 
              size={20} 
              color={selectedIndex === content.correct_answer_index ? "#10b981" : "#f59e0b"} 
            />
            <Text style={styles.explanationTitle}>
              {selectedIndex === content.correct_answer_index ? "Correct!" : "Not quite right"}
            </Text>
          </View>
          <Text style={styles.explanationText}>{content.explanation}</Text>
        </View>
      )}

      <View style={styles.footer}>
        {!submitted ? (
          <>
            <TouchableOpacity
              style={[styles.button, styles.submitButton, !selectedIndex && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={selectedIndex === null}
            >
              <Text style={styles.submitButtonText}>Submit Answer</Text>
            </TouchableOpacity>
            {!isRequired && (
              <TouchableOpacity style={[styles.button, styles.skipButton]} onPress={handleSkip}>
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.resultMessage}>
            <Text style={styles.resultText}>
              {selectedIndex === content.correct_answer_index 
                ? "Great job! Moving to next..." 
                : "Let's continue learning..."}
            </Text>
          </View>
        )}
      </View>
    </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  questionContainer: {
    marginBottom: 24,
  },
  question: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
    fontWeight: '500',
  },
  optionsContainer: {
    maxHeight: 300,
    marginBottom: 20,
  },
  option: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: '#4f46e5',
    backgroundColor: '#eff6ff',
  },
  optionCorrect: {
    borderColor: '#10b981',
    backgroundColor: '#d1fae5',
  },
  optionIncorrect: {
    borderColor: '#ef4444',
    backgroundColor: '#fee2e2',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIndicatorSelected: {
    backgroundColor: '#4f46e5',
  },
  optionIndicatorCorrect: {
    backgroundColor: '#10b981',
  },
  optionIndicatorIncorrect: {
    backgroundColor: '#ef4444',
  },
  optionLetter: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 20,
  },
  optionTextSelected: {
    color: '#1e40af',
    fontWeight: '500',
  },
  optionTextCorrect: {
    color: '#065f46',
    fontWeight: '500',
  },
  optionTextIncorrect: {
    color: '#991b1b',
    fontWeight: '500',
  },
  explanationContainer: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  explanationText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
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
    backgroundColor: '#4f46e5',
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
  resultMessage: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  resultText: {
    fontSize: 16,
    color: '#6b7280',
    fontStyle: 'italic',
  },
});
