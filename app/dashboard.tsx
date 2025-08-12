import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Layout } from '../components/Layout';
import { supabaseService } from '../services/supabaseService';
import { UserProfile, Subject, Course } from '../types';
import { router } from 'expo-router';

export default function DashboardScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userSubjects, setUserSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
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

      // Load user courses
      const coursesResult = await supabaseService.getUserCourses(user.id);
      if (coursesResult.data) {
        setCourses(coursesResult.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
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
            <Text style={styles.sectionTitle}>
              Your Courses ({courses.length})
            </Text>
            {courses.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="book-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyStateTitle}>No courses yet</Text>
                <Text style={styles.emptyStateText}>
                  We're generating personalized courses based on your interests.
                  Check back soon!
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
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

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
});
