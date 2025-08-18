import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Layout } from '../components/Layout';
import { supabaseService } from '../services/supabaseService';
import { Course, Subject, UserProfile } from '../types';
import AppNavigation from '../lib/navigation';

export default function DashboardScreen() {
  const { width: screenWidth } = Dimensions.get('window');
  const isTablet = screenWidth >= 768;
  const isMobile = screenWidth < 768;
  const styles = createStyles(screenWidth, isMobile, isTablet);
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

      // Load user courses (same for all users now)
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
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Learning Journey Stats Card */}
          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <Text style={styles.statsTitle}>Your Learning Journey</Text>
              <Text style={styles.statsPercentage}>
                {Math.round(
                  courses.length > 0
                    ? (courses.reduce((sum, course) => sum + (course.completed_lessons || 0), 0) /
                      courses.reduce((sum, course) => sum + course.total_lessons, 0)) * 100
                    : 0
                )}% Complete
              </Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${Math.round(
                      courses.length > 0
                        ? (courses.reduce((sum, course) => sum + (course.completed_lessons || 0), 0) /
                          courses.reduce((sum, course) => sum + course.total_lessons, 0)) * 100
                        : 0
                    )}%`
                  }
                ]}
              />
            </View>

            {/* Stats Grid */}
            <View style={isTablet ? styles.statsScrollView : {}}>
              <View style={[styles.statsGrid, isTablet && styles.statsGridDesktop]}>
                <View style={[styles.statItem, isTablet && styles.statItemDesktop]}>
                  <View style={[styles.statItemContent, styles.statItemBlue]}>
                    <Ionicons name="play-circle" size={24} color="#4f46e5" style={styles.statIcon} />
                    <Text style={[styles.statNumber, styles.statNumberBlue]}>
                      {courses.reduce((sum, course) => sum + (course.completed_lessons || 0), 0)}
                    </Text>
                    <Text style={styles.statLabel}>Lessons Completed</Text>
                  </View>
                </View>

                <View style={[styles.statItem, isTablet && styles.statItemDesktop]}>
                  <View style={[styles.statItemContent, styles.statItemAmber]}>
                    <Ionicons name="bookmark" size={24} color="#f59e0b" style={styles.statIcon} />
                    <Text style={[styles.statNumber, styles.statNumberAmber]}>
                      {courses.length}
                    </Text>
                    <Text style={styles.statLabel}>Active Courses</Text>
                  </View>
                </View>

                <View style={[styles.statItem, isTablet && styles.statItemDesktop]}>
                  <View style={[styles.statItemContent, styles.statItemGreen]}>
                    <Ionicons name="stats-chart" size={24} color="#10b981" style={styles.statIcon} />
                    <Text style={[styles.statNumber, styles.statNumberGreen]}>
                      {(profile?.commute_time || 30) * 2}
                    </Text>
                    <Text style={styles.statLabel}>Minutes/Day</Text>
                  </View>
                </View>

                <View style={[styles.statItem, isTablet && styles.statItemDesktop]}>
                  <View style={[styles.statItemContent, styles.statItemPurple]}>
                    <Ionicons name="trophy" size={24} color="#8b5cf6" style={styles.statIcon} />
                    <Text style={[styles.statNumber, styles.statNumberPurple]}>0</Text>
                    <Text style={styles.statLabel}>Achievements</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Premium Banner */}
          {profile?.subscription_tier === 'free' && (
            <View style={styles.premiumBanner}>
              <View style={styles.premiumBannerContent}>
                <View style={styles.premiumIconContainer}>
                  <Ionicons name="star" size={24} color="white" />
                </View>
                <View style={styles.premiumTextContainer}>
                  <Text style={styles.premiumTitle}>Upgrade to CommutIQ Premium</Text>
                  <Text style={styles.premiumDescription}>
                    Get access to expert-curated learning plans, certifications, and exclusive partner content.
                  </Text>
                  <TouchableOpacity style={styles.premiumButton}>
                    <Text style={styles.premiumButtonText}>Upgrade for $7.99/month</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Your Courses */}
          <Text style={styles.sectionTitle}>Your Courses</Text>
          <View style={styles.coursesGrid}>
            {courses.map(course => {
              const subject = userSubjects.find(s => s.id === course.subject_id);
              const progress = course.total_lessons > 0 ? (course.completed_lessons || 0) / course.total_lessons : 0;

              return (
                <TouchableOpacity 
                  key={course.id} 
                  style={styles.modernCourseCard}
                  onPress={() => AppNavigation.toCourse(course.id)}
                  activeOpacity={0.8}
                >
                  {/* Course Header */}
                  <View style={[
                    styles.courseHeader,
                    { backgroundColor: subject?.color?.background || '#e0e7ff' }
                  ]}>
                    <View style={styles.courseIconContainer}>
                      <Ionicons
                        name={subject?.icon || 'book'}
                        size={20}
                        color={subject?.color?.text || '#4f46e5'}
                      />
                    </View>
                    <View style={styles.courseHeaderText}>
                      <Text style={styles.courseCardTitle}>{course.title}</Text>
                      <Text style={styles.courseSubject}>{subject?.name || 'Course'}</Text>
                    </View>
                  </View>

                  {/* Course Body */}
                  <View style={styles.courseBody}>
                    <View style={styles.progressSection}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Progress</Text>
                        <Text style={styles.progressText}>
                          {course.completed_lessons || 0}/{course.total_lessons} lessons
                        </Text>
                      </View>
                      <View style={styles.progressBarContainer}>
                        <View
                          style={[
                            styles.courseProgressBar,
                            { width: `${progress * 100}%` }
                          ]}
                        />
                      </View>
                    </View>

                    <View style={styles.nextLessonSection}>
                      <Text style={styles.nextUpLabel}>Next up:</Text>
                      <Text style={styles.nextLessonTitle} numberOfLines={1}>
                        {course.next_lesson?.title || `Lesson ${(course.completed_lessons || 0) + 1}`}
                      </Text>
                      <Text style={styles.lessonDuration}>
                        {course.next_lesson?.duration || profile?.commute_time || 30} min · Audio Lesson
                      </Text>
                    </View>

                    <TouchableOpacity 
                      style={styles.startLessonButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        if (course.next_lesson?.id) {
                          AppNavigation.toLesson(course.next_lesson.id, course.id);
                        } else {
                          // If no next lesson, navigate to the course page to select a lesson
                          AppNavigation.toCourse(course.id);
                        }
                      }}
                    >
                      <Ionicons name="play" size={16} color="white" />
                      <Text style={styles.startLessonText}>Start Lesson</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
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

  // Stats Card Styles
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statsPercentage: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 5,
  },
  statsScrollView: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statsGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
  },
  statItem: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  statItemDesktop: {
    width: 'auto',
    flex: 1,
    marginHorizontal: 6,
    marginBottom: 0,
    paddingHorizontal: 0,
    minWidth: 140,
  },
  statItemContent: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  statItemBlue: {
    backgroundColor: '#e0e7ff',
  },
  statItemAmber: {
    backgroundColor: '#fef3c7',
  },
  statItemGreen: {
    backgroundColor: '#d1fae5',
  },
  statItemPurple: {
    backgroundColor: '#ede9fe',
  },
  statIcon: {
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statNumberBlue: {
    color: '#4f46e5',
  },
  statNumberAmber: {
    color: '#f59e0b',
  },
  statNumberGreen: {
    color: '#10b981',
  },
  statNumberPurple: {
    color: '#8b5cf6',
  },
  statLabel: {
    fontSize: 11,
    color: '#4b5563',
    textAlign: 'center',
  },

  // Premium Banner Styles
  premiumBanner: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  premiumBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 50,
    padding: 12,
    marginRight: 16,
  },
  premiumTextContainer: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  premiumDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
    lineHeight: 20,
  },
  premiumButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  premiumButtonText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '600',
  },

  // Course Grid Styles
  coursesGrid: {
    flexDirection: isMobile ? 'column' : 'row',
    flexWrap: isMobile ? 'nowrap' : 'wrap',
    marginHorizontal: isMobile ? 0 : -8,
    marginBottom: 32,
  },
  modernCourseCard: {
    width: isMobile ? '100%' : (screenWidth - 48) / 2,
    marginHorizontal: isMobile ? 0 : 8,
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  courseHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseIconContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
    marginRight: 12,
  },
  courseHeaderText: {
    flex: 1,
  },
  courseCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  courseSubject: {
    fontSize: 13,
    color: '#4b5563',
  },
  courseBody: {
    padding: 16,
    paddingTop: 0,
  },
  progressSection: {
    marginTop: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
    minHeight: 20,
  },
  progressLabel: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 16,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
    lineHeight: 16,
  },
  courseProgressBar: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 4,
  },
  nextLessonSection: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 16,
    marginBottom: 16,
  },
  nextUpLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  nextLessonTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  lessonDuration: {
    fontSize: 12,
    color: '#9ca3af',
  },
  startLessonButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startLessonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
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
