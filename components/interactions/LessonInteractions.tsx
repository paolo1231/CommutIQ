import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { 
  LessonInteraction, 
  UserInteractionResponse,
  QuizContent,
  ReflectionContent,
  DiscussionContent,
  QuizResponse,
  ReflectionResponse,
  DiscussionResponse,
} from '../../types';
import { QuizInteraction } from './QuizInteraction';
import { ReflectionInteraction } from './ReflectionInteraction';
import { DiscussionInteraction } from './DiscussionInteraction';
import { supabaseService } from '../../services/supabaseService';

interface LessonInteractionsProps {
  lessonId: string;
  userId: string;
  currentPosition: number; // Current audio position in seconds
  isPlaying: boolean;
  onPauseRequest?: () => void;
  onResumeRequest?: () => void;
  onInteractionComplete?: (interaction: LessonInteraction, response: UserInteractionResponse) => void;
}

export const LessonInteractions: React.FC<LessonInteractionsProps> = ({
  lessonId,
  userId,
  currentPosition,
  isPlaying,
  onPauseRequest,
  onResumeRequest,
  onInteractionComplete,
}) => {
  const [interactions, setInteractions] = useState<LessonInteraction[]>([]);
  const [currentInteraction, setCurrentInteraction] = useState<LessonInteraction | null>(null);
  const [completedInteractionIds, setCompletedInteractionIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [modalAnimation] = useState(new Animated.Value(0));
  const [loading, setLoading] = useState(true);

  // Load interactions for the lesson
  useEffect(() => {
    loadInteractions();
  }, [lessonId]);

  // Check for interactions at current position
  useEffect(() => {
    if (!isPlaying || interactions.length === 0) return;

    const eligibleInteraction = interactions.find(interaction => {
      const hasBeenCompleted = completedInteractionIds.has(interaction.id);
      const isAtPosition = Math.abs(currentPosition - interaction.position_seconds) < 2; // 2-second window
      return !hasBeenCompleted && isAtPosition;
    });

    if (eligibleInteraction && !currentInteraction) {
      triggerInteraction(eligibleInteraction);
    }
  }, [currentPosition, isPlaying, interactions, completedInteractionIds, currentInteraction]);

  const loadInteractions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabaseService.getLessonInteractions(lessonId);
      
      if (data && !error) {
        setInteractions(data);
        
        // Load completed interactions for this user
        const completedIds = await loadCompletedInteractions(data);
        setCompletedInteractionIds(new Set(completedIds));
      }
    } catch (error) {
      console.error('Error loading interactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedInteractions = async (interactions: LessonInteraction[]): Promise<string[]> => {
    try {
      const promises = interactions.map(interaction =>
        supabaseService.getUserInteractionResponse(userId, interaction.id)
      );
      
      const responses = await Promise.all(promises);
      return responses
        .filter(r => r.data)
        .map(r => r.data!.interaction_id);
    } catch (error) {
      console.error('Error loading completed interactions:', error);
      return [];
    }
  };

  const triggerInteraction = (interaction: LessonInteraction) => {
    // Pause audio playback
    onPauseRequest?.();
    
    // Set current interaction and show modal
    setCurrentInteraction(interaction);
    setShowModal(true);
    
    // Animate modal entrance
    Animated.timing(modalAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleInteractionSubmit = async (response: QuizResponse | ReflectionResponse | DiscussionResponse) => {
    if (!currentInteraction) return;

    try {
      // Calculate score for quiz
      let score: number | undefined;
      if (currentInteraction.type === 'quiz' && 'is_correct' in response) {
        score = response.is_correct ? 100 : 0;
      }

      // Save response to database
      const userResponse: Omit<UserInteractionResponse, 'id'> = {
        user_id: userId,
        interaction_id: currentInteraction.id,
        response: response,
        score,
        completed_at: new Date().toISOString(),
        metadata: {
          lesson_position: currentPosition,
          interaction_type: currentInteraction.type,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseService.saveInteractionResponse(userResponse);
      
      if (data && !error) {
        // Mark as completed
        setCompletedInteractionIds(prev => new Set([...prev, currentInteraction.id]));
        
        // Notify parent component
        onInteractionComplete?.(currentInteraction, data);
      }
    } catch (error) {
      console.error('Error saving interaction response:', error);
    }

    // Close modal and resume playback
    closeInteraction();
  };

  const handleInteractionSkip = () => {
    if (!currentInteraction) return;

    // Mark as skipped (but not completed)
    // You might want to track skipped interactions separately
    
    closeInteraction();
  };

  const closeInteraction = () => {
    // Animate modal exit
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
      setCurrentInteraction(null);
      
      // Resume audio playback
      onResumeRequest?.();
    });
  };

  const renderInteraction = () => {
    if (!currentInteraction) return null;

    const commonProps = {
      onSkip: currentInteraction.is_required ? undefined : handleInteractionSkip,
      isRequired: currentInteraction.is_required,
    };

    switch (currentInteraction.type) {
      case 'quiz':
        return (
          <QuizInteraction
            content={currentInteraction.content as QuizContent}
            onSubmit={handleInteractionSubmit}
            {...commonProps}
          />
        );
      
      case 'reflection':
        return (
          <ReflectionInteraction
            content={currentInteraction.content as ReflectionContent}
            onSubmit={handleInteractionSubmit}
            {...commonProps}
          />
        );
      
      case 'discussion':
        return (
          <DiscussionInteraction
            content={currentInteraction.content as DiscussionContent}
            onSubmit={handleInteractionSubmit}
            {...commonProps}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="none"
      onRequestClose={currentInteraction?.is_required ? undefined : handleInteractionSkip}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContent,
            {
              opacity: modalAnimation,
              transform: [
                {
                  translateY: modalAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {renderInteraction()}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: Dimensions.get('window').width * 0.95,
    maxWidth: 600,
    maxHeight: Dimensions.get('window').height * 0.85,
  },
});
