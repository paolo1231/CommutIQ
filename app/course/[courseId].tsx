import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Layout } from '../../components/Layout';
import AppNavigation from '../../lib/navigation';
import { supabaseService } from '../../services/supabaseService';
import { Course, Lesson, UserProgress } from '../../types';

export default function CourseDetailScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { width: screenWidth } = Dimensions.get('window');
  const isTablet = screenWidth >= 768;
  const isMobile = screenWidth < 768;
  const styles = createStyles(screenWidth, isMobile, isTablet);

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId) {
      loadCourseDetails();
    }
  }, [courseId]);

  // Refresh progress when screen comes into focus (e.g., returning from a lesson)
  useFocusEffect(
    useCallback(() => {
      if (courseId && !loading) {
        refreshProgress();
      }
    }, [courseId, loading])
  );

  const refreshProgress = async () => {
    try {
      const { user } = await supabaseService.getCurrentUser();
      if (!user) return;

      // Reload progress data
      const progressResponse = await supabaseService.getUserProgress(user.id);
      if (progressResponse.data) {
        const courseProgress = progressResponse.data.filter(p => {
          return lessons.some(l => l.id === p.lesson_id);
        });
        setProgress(courseProgress);

        // Update completed lessons count
        const completedCount = lessons.filter(lesson =>
          courseProgress.some(p => p.lesson_id === lesson.id && p.progress_percentage >= 100)
        ).length;

        if (course) {
          setCourse({
            ...course,
            completed_lessons: completedCount
          });
        }
      }
    } catch (error) {
      console.error('Error refreshing progress:', error);
    }
  };

  const loadCourseDetails = async () => {
    try {
      const { user } = await supabaseService.getCurrentUser();

      if (!user) {
        router.replace('/onboarding');
        return;
      }

      // Load course with progress data
      const courseResponse = await supabaseService.getCourseWithProgress(courseId, user.id);

      if (courseResponse.error || !courseResponse.data) {
        Alert.alert('Error', 'Failed to load course details');
        return;
      }

      const courseData = courseResponse.data;

      // Debug logging
      console.debug('Course loaded:', {
        title: courseData.title,
        courseId: courseData.id,
        lessonsCount: courseData.lessons?.length || 0,
        lessons: courseData.lessons?.map(l => ({ id: l.id, title: l.title, order: l.lesson_order }))
      });

      setCourse(courseData);
      setProgress(courseData.progress || []);

      // Set lessons sorted by lesson_order
      const sortedLessons = courseData.lessons?.sort((a, b) => a.lesson_order - b.lesson_order) || [];

      console.debug('Final lessons:', sortedLessons.map(l => ({ id: l.id, title: l.title })));
      setLessons(sortedLessons);

    } catch (error) {
      console.error('Error loading course details:', error);
      Alert.alert('Error', 'Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  const handleStartLesson = (lessonId: string) => {
    console.log('Starting lesson:', { lessonId, courseId });
    if (!lessonId || lessonId === 'undefined' || lessonId === 'null') {
      Alert.alert('Error', 'This lesson is not available yet. Please try another lesson.');
      return;
    }
    AppNavigation.toLesson(lessonId, courseId);
  };

  const isLessonCompleted = (lessonId: string) => {
    return progress.some(p => p.lesson_id === lessonId && p.progress_percentage >= 100);
  };

  const getLessonProgress = (lessonId: string) => {
    const lessonProgress = progress.find(p => p.lesson_id === lessonId);
    return lessonProgress?.progress_percentage || 0;
  };

  if (loading) {
    return (
      <Layout>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading course details...</Text>
        </View>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Course not found</Text>
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

  const completedLessonsCount = course.completed_lessons || 0;
  const totalLessons = course.total_lessons;
  const progressPercentage = totalLessons > 0 ? (completedLessonsCount / totalLessons) * 100 : 0;

  return (
    <Layout>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButtonContainer}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={24} color="#4f46e5" />
              <Text style={styles.backButtonText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>

          {/* Course Info Card */}
          <View style={styles.courseInfoCard}>
            <View style={styles.courseIconContainer}>
              <Ionicons
                name={course.subject?.icon || 'book'}
                size={32}
                color="#4f46e5"
                style={styles.courseIcon}
              />
            </View>

            <View style={styles.courseInfo}>
              <Text style={styles.courseTitle}>{course.title}</Text>
              <Text style={styles.courseCategory}>{course.subject?.name || 'Course'}</Text>
            </View>
          </View>

          {/* Progress Section */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Course Progress</Text>
              <Text style={styles.progressText}>
                {completedLessonsCount}/{totalLessons} lessons
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${progressPercentage}%` }
                ]}
              />
            </View>
          </View>

          {/* Course Lessons */}
          <View style={styles.lessonsSection}>
            <Text style={styles.sectionTitle}>Course Lessons</Text>

            <View style={styles.lessonsList}>
              {lessons.length === 0 ? (
                <View style={styles.emptyLessonsContainer}>
                  <Ionicons name="book-outline" size={48} color="#9ca3af" />
                  <Text style={styles.emptyLessonsTitle}>No lessons available</Text>
                  <Text style={styles.emptyLessonsText}>
                    Lessons for this course are being prepared. Please check back later.
                  </Text>
                </View>
              ) : (
                lessons.map((lesson, index) => {

                  if (!lesson.id) {
                    console.error('Lesson has no ID:', lesson);
                    return null;
                  }

                  const isCompleted = isLessonCompleted(lesson.id);
                  const lessonProgressPercentage = getLessonProgress(lesson.id);
                  const isNextLesson = !isCompleted && lessons.slice(0, index).every(l => isLessonCompleted(l.id));

                  return (
                    <TouchableOpacity
                      key={lesson.id}
                      style={[
                        styles.lessonCard,
                        isCompleted && styles.lessonCardCompleted,
                        isNextLesson && styles.lessonCardNext
                      ]}
                      onPress={() => handleStartLesson(lesson.id)}
                      disabled={!isCompleted && !isNextLesson && index > 0}
                    >
                      <View style={styles.lessonNumber}>
                        <Text style={[
                          styles.lessonNumberText,
                          isCompleted && styles.lessonNumberTextCompleted,
                          isNextLesson && styles.lessonNumberTextNext
                        ]}>
                          {index + 1}
                        </Text>
                      </View>

                      <View style={styles.lessonContent}>
                        <Text style={[
                          styles.lessonTitle,
                          isCompleted && styles.lessonTitleCompleted
                        ]}>
                          {lesson.title}
                        </Text>
                        <Text style={styles.lessonDuration}>
                          {lesson.duration} min • Audio Lesson
                        </Text>

                        {lessonProgressPercentage > 0 && lessonProgressPercentage < 100 && (
                          <View style={styles.lessonProgressContainer}>
                            <View style={styles.lessonProgressBarContainer}>
                              <View
                                style={[
                                  styles.lessonProgressBar,
                                  { width: `${lessonProgressPercentage}%` }
                                ]}
                              />
                            </View>
                            <Text style={styles.lessonProgressText}>
                              {Math.round(lessonProgressPercentage)}%
                            </Text>
                          </View>
                        )}
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.startButton,
                          isCompleted && styles.startButtonCompleted,
                          isNextLesson && styles.startButtonNext,
                          (!isCompleted && !isNextLesson && index > 0) && styles.startButtonDisabled
                        ]}
                        onPress={() => handleStartLesson(lesson.id)}
                        disabled={!isCompleted && !isNextLesson && index > 0}
                      >
                        <Ionicons
                          name={isCompleted ? "checkmark" : "play"}
                          size={16}
                          color={
                            isCompleted ? "#10b981" :
                              isNextLesson ? "white" :
                                (!isCompleted && !isNextLesson && index > 0) ? "#9ca3af" : "#4f46e5"
                          }
                        />
                        <Text style={[
                          styles.startButtonText,
                          isCompleted && styles.startButtonTextCompleted,
                          isNextLesson && styles.startButtonTextNext,
                          (!isCompleted && !isNextLesson && index > 0) && styles.startButtonTextDisabled
                        ]}>
                          {isCompleted ? "Completed" : isNextLesson ? "Start" : lessonProgressPercentage > 0 ? "Continue" : "Start"}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </Layout>
  );
}

const createStyles = (screenWidth: number, isMobile: boolean, isTablet: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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

  // Header Styles
  header: {
    marginBottom: 24,
  },
  backButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#4f46e5',
    fontWeight: '500',
    marginLeft: 4,
  },
  backButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },

  // Course Info Card
  courseInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  courseIconContainer: {
    backgroundColor: '#e0e7ff',
    borderRadius: 20,
    padding: 16,
    marginRight: 16,
  },
  courseIcon: {
    // Additional icon styles if needed
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  courseCategory: {
    fontSize: 14,
    color: '#6b7280',
  },

  // Progress Card
  progressCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 4,
  },

  // Lessons Section
  lessonsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  lessonsList: {
    // Container styles
  },

  // Empty Lessons Styles
  emptyLessonsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyLessonsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyLessonsText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Lesson Card Styles
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  lessonCardCompleted: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  lessonCardNext: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 4,
    borderLeftColor: '#4f46e5',
  },
  lessonNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  lessonNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  lessonNumberTextCompleted: {
    color: '#10b981',
  },
  lessonNumberTextNext: {
    color: '#4f46e5',
  },
  lessonContent: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  lessonTitleCompleted: {
    color: '#059669',
  },
  lessonDuration: {
    fontSize: 12,
    color: '#9ca3af',
  },
  lessonProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  lessonProgressBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginRight: 8,
  },
  lessonProgressBar: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 2,
  },
  lessonProgressText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    minWidth: 32,
  },

  // Start Button Styles
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#4f46e5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  startButtonCompleted: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  startButtonNext: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  startButtonDisabled: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
    marginLeft: 4,
  },
  startButtonTextCompleted: {
    color: '#10b981',
  },
  startButtonTextNext: {
    color: 'white',
  },
  startButtonTextDisabled: {
    color: '#9ca3af',
  },
});
