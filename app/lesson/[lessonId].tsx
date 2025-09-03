import { SimpleStreamingAudioPlayer } from '@/components/SimpleStreamingAudioPlayer';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Layout } from '../../components/Layout';
import { supabaseService } from '../../services/supabaseService';
import { Course, Lesson } from '../../types';

export default function LessonScreen() {
  const params = useLocalSearchParams<{ lessonId: string; courseId?: string }>();
  const lessonId = params.lessonId;
  const courseId = params.courseId;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (lessonId && lessonId !== 'undefined' && lessonId !== 'null') {
      loadLessonData();
    } else {
      Alert.alert('Error', 'Invalid lesson ID');
      router.back();
    }
  }, [lessonId, courseId]);

  const loadLessonData = async () => {
    try {
      const { user } = await supabaseService.getCurrentUser();

      if (!user) {
        router.replace('/onboarding');
        return;
      }

      // Load lesson from database
      const lessonResponse = await supabaseService.getLessonById(lessonId);

      if (lessonResponse.error || !lessonResponse.data) {
        Alert.alert('Error', 'Failed to load lesson');
        router.back();
        return;
      }

      const lessonData = lessonResponse.data;
      setLesson(lessonData);

      // Load course details if courseId provided
      if (courseId) {
        const courseResponse = await supabaseService.getCourseById(courseId);
        if (courseResponse.data) {
          setCourse(courseResponse.data);
        }
      }

    } catch (error) {
      console.error('Error loading lesson:', error);
      Alert.alert('Error', 'Failed to load lesson');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading lesson...</Text>
        </View>
      </Layout>
    );
  }

  if (!lesson) {
    return (
      <Layout>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Lesson not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButtonContainer}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={24} color="#4f46e5" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.lessonInfo}>
            <View style={styles.lessonIconContainer}>
              <Ionicons name="book" size={24} color="#4f46e5" />
            </View>
            <View style={styles.lessonDetails}>
              <Text style={styles.lessonTitle}>{lesson.title}</Text>
              <Text style={styles.lessonMeta}>
                {course?.title || 'Lesson'} • {lesson.duration} min
              </Text>
            </View>
          </View>
        </View>

        {/* Audio Player */}
        <View style={styles.audioPlayerContainer}>
          <SimpleStreamingAudioPlayer
            transcript={lesson.transcript}
            title={lesson.title}
            voice="sage"
            autoPlay={false}
            onProgressUpdate={(progress, position) => {
              console.log(`[Lesson] Audio progress: ${progress.toFixed(1)}% at ${position.toFixed(1)}s`);
            }}
            onComplete={() => {
              console.log(`[Lesson] Audio playback completed for lesson: ${lesson.title}`);
            }}
          />
        </View>

        {/* Transcript */}
        <View style={styles.transcriptContainer}>
          <Text style={styles.transcriptTitle}>Lesson Transcript</Text>
          <View style={styles.transcriptContent}>
            <Text style={styles.transcriptText}>{lesson.transcript}</Text>
          </View>
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // Header Styles
  header: {
    backgroundColor: '#e0e7ff',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    color: '#4f46e5',
    fontWeight: '600',
    marginLeft: 4,
  },
  lessonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lessonIconContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 8,
    marginRight: 12,
  },
  lessonDetails: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  lessonMeta: {
    fontSize: 14,
    color: '#6b7280',
  },

  // Audio Player Container
  audioPlayerContainer: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },

  // Transcript Styles
  transcriptContainer: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  transcriptTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  transcriptContent: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4f46e5',
  },
  transcriptText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
  },
});