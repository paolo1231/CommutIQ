import { freeUserContentService } from '@/services/freeUserContentService';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Layout } from '../components/Layout';
import { supabaseService } from '../services/supabaseService';
import { Course, Subject, UserProfile } from '../types';

export default function DashboardScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userSubjects, setUserSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [preGeneratedCourses, setPreGeneratedCourses] = useState<PreGeneratedCourse[]>([]);
  const [recommendations, setRecommendations] = useState<PreGeneratedCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { user } = await supabaseService.getCurrentUser();

      if (!user) {
        router.replace('/onboarding');
        return;
      }

      // Load user profile
      const profileResult = await supabaseService.getUserProfile(user.id);
      if (profileResult.data) {
        setProfile(profileResult.data);
      }

      // Load user subjects
      const subjectsResult = await supabaseService.getUserSubjects(user.id);
      if (subjectsResult.data) {
        const subjects = subjectsResult.data
          .map(us => us.subject)
          .filter(s => s !== undefined) as Subject[];
        setUserSubjects(subjects);
      }

      // Load content based on user tier
      if (profileResult.data?.subscription_tier === 'free') {
        // Load pre-generated courses for free users
        const subjectIds = subjectsResult.data?.map(us => us.subject_id) || [];
        const commuteTime = profileResult.data.commute_time || 30;

        const freeUserContent = await freeUserContentService.getAvailableCoursesForFreeUser(
          user.id,
          subjectIds,
          commuteTime,
          'beginner'
        );

        setCourses(freeUserContent.userCourses);
        setPreGeneratedCourses(freeUserContent.preGenerated);
        setRecommendations(freeUserContent.recommendations);
      } else {
        // Load regular courses for premium users
        const coursesResult = await supabaseService.getUserCourses(user.id);
        if (coursesResult.data) {
          setCourses(coursesResult.data);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollInCourse = async (preGeneratedCourseId: string) => {
    try {
      const { user } = await supabaseService.getCurrentUser();
      if (!user) return;

      const userCourse = await freeUserContentService.enrollFreeUserInCourse(
        user.id,
        preGeneratedCourseId
      );

      // Update courses list
      setCourses(prev => [...prev, userCourse]);

      // Remove from available pre-generated courses
      setPreGeneratedCourses(prev =>
        prev.filter(course => course.id !== preGeneratedCourseId)
      );

      Alert.alert('Success', 'Course added to your library!');
    } catch (error) {
      Alert.alert('Error', 'Failed to enroll in course');
    }
  };

  const handleSignOut = async () => {
    try {
      await supabaseService.signOut();
      router.replace('/onboarding');
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  if (loading) {
    return (
      <Layout>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Welcome back!</Text>
            <Text style={styles.welcomeSubtitle}>
              Ready for your {profile?.commute_time || 30}-minute learning session?
            </Text>
          </View>

          {/* Your Subjects */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Learning Subjects</Text>
            <View style={styles.subjectsGrid}>
              {userSubjects.map((subject, index) => (
                <View key={subject.id} style={styles.subjectCard}>
                  <Text style={styles.subjectName}>{subject.name}</Text>
                  {subject.is_premium && (
                    <View style={styles.premiumBadge}>
                      <Ionicons name="star" size={12} color="#f59e0b" />
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Your Courses */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Your Courses ({courses.length})
              </Text>
              {profile?.subscription_tier === 'free' && (
                <View style={styles.tierBadge}>
                  <Text style={styles.tierBadgeText}>FREE</Text>
                </View>
              )}
            </View>
            {courses.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="book-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyStateTitle}>No courses yet</Text>
                <Text style={styles.emptyStateText}>
                  {profile?.subscription_tier === 'free'
                    ? 'Browse available courses below to get started!'
                    : 'We\'re generating personalized courses based on your interests. Check back soon!'
                  }
                </Text>
              </View>
            ) : (
              <View style={styles.coursesList}>
                {courses.map(course => (
                  <TouchableOpacity key={course.id} style={styles.courseCard}>
                    <Text style={styles.courseTitle}>{course.title}</Text>
                    <Text style={styles.courseInfo}>
                      {course.total_lessons} lessons • {course.estimated_duration} min
                    </Text>
                    {course.pre_generated_course_id && (
                      <View style={styles.preGeneratedBadge}>
                        <Text style={styles.preGeneratedBadgeText}>Pre-built Course</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Available Courses (Free Users Only) */}
          {profile?.subscription_tier === 'free' && preGeneratedCourses.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available Courses</Text>
              <View style={styles.coursesList}>
                {preGeneratedCourses.map(course => (
                  <TouchableOpacity
                    key={course.id}
                    style={styles.availableCourseCard}
                    onPress={() => handleEnrollInCourse(course.id)}
                  >
                    <Text style={styles.courseTitle}>{course.title}</Text>
                    <Text style={styles.courseDescription}>{course.description}</Text>
                    <Text style={styles.courseInfo}>
                      {course.total_lessons} lessons • {course.estimated_duration} min • {course.difficulty}
                    </Text>
                    <View style={styles.enrollButton}>
                      <Ionicons name="add-circle" size={16} color="#3b82f6" />
                      <Text style={styles.enrollButtonText}>Add to Library</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Recommendations (Free Users Only) */}
          {profile?.subscription_tier === 'free' && recommendations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recommended for You</Text>
              <View style={styles.coursesList}>
                {recommendations.map(course => (
                  <TouchableOpacity
                    key={course.id}
                    style={styles.recommendationCard}
                    onPress={() => handleEnrollInCourse(course.id)}
                  >
                    <Text style={styles.courseTitle}>{course.title}</Text>
                    <Text style={styles.courseDescription}>{course.description}</Text>
                    <Text style={styles.courseInfo}>
                      {course.total_lessons} lessons • {course.estimated_duration} min
                    </Text>
                    <View style={styles.enrollButton}>
                      <Ionicons name="star" size={16} color="#f59e0b" />
                      <Text style={styles.enrollButtonText}>Try This</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Upgrade Prompt (Free Users Only) */}
          {profile?.subscription_tier === 'free' && (
            <View style={styles.section}>
              <View style={styles.upgradeCard}>
                <Text style={styles.upgradeTitle}>🚀 Upgrade to Premium</Text>
                <Text style={styles.upgradeDescription}>
                  Get personalized AI-generated courses tailored specifically for your learning goals!
                </Text>
                <TouchableOpacity style={styles.upgradeButton}>
                  <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <TouchableOpacity style={styles.actionButton} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.actionButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  welcomeSection: {
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  subjectCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  premiumBadge: {
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  coursesList: {
    gap: 12,
  },
  courseCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  courseInfo: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ef4444',
    marginLeft: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  preGeneratedBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  preGeneratedBadgeText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '500',
  },
  availableCourseCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  courseDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 20,
  },
  enrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  enrollButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginLeft: 6,
  },
  recommendationCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  upgradeCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  upgradeDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  upgradeButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
