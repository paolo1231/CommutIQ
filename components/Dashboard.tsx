import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CourseCard } from './CourseCard';
import { PremiumBanner } from './PremiumBanner';
import { ProgressBar } from './ProgressBar';

interface Subject {
  id: number;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: {
    background: string;
    text: string;
  };
}

interface Course {
  id: string;
  title: string;
  subject: string;
  totalLessons: number;
  completedLessons: number;
  nextLesson: {
    title: string;
    duration: number;
  };
  color: {
    background: string;
    text: string;
  };
  icon: keyof typeof Ionicons.glyphMap;
  isPremium: boolean;
}

interface UserData {
  commuteTime: number;
  selectedSubjects: Subject[];
  progress: any;
}

interface DashboardProps {
  userData: UserData;
}

export const Dashboard: React.FC<DashboardProps> = ({ userData }) => {
  const { commuteTime, selectedSubjects } = userData;
  const [courses, setCourses] = useState<Course[]>([]);
  const [premiumCourses, setPremiumCourses] = useState<Course[]>([]);

  useEffect(() => {
    // Simulate API call to generate courses based on selected subjects and commute time
    const generatedCourses: Course[] = selectedSubjects.map(subject => ({
      id: `course-${subject.id}`,
      title: `${subject.name} Fundamentals`,
      subject: subject.name,
      icon: subject.icon,
      color: subject.color,
      totalLessons: Math.ceil(commuteTime / 10) * 3,
      completedLessons: 0,
      nextLesson: {
        title: `Introduction to ${subject.name}`,
        duration: Math.min(commuteTime, 15)
      },
      isPremium: false
    }));

    // Generate premium courses
    const generatedPremiumCourses: Course[] = [
      {
        id: 'premium-1',
        title: 'Advanced Language Mastery',
        subject: 'Premium Course',
        icon: selectedSubjects[0]?.icon || 'book-outline',
        color: { background: '#fef3c7', text: '#d97706' },
        totalLessons: 12,
        completedLessons: 0,
        nextLesson: {
          title: 'Expert-Curated Language Techniques',
          duration: Math.min(commuteTime, 20)
        },
        isPremium: true
      },
      {
        id: 'premium-2',
        title: 'Career Certification Path',
        subject: 'Premium Course',
        icon: selectedSubjects[1]?.icon || selectedSubjects[0]?.icon || 'school-outline',
        color: { background: '#fef3c7', text: '#d97706' },
        totalLessons: 15,
        completedLessons: 0,
        nextLesson: {
          title: 'Industry-Recognized Skills',
          duration: Math.min(commuteTime, 18)
        },
        isPremium: true
      }
    ];

    setCourses(generatedCourses);
    setPremiumCourses(generatedPremiumCourses);
  }, [selectedSubjects, commuteTime]);

  const startLesson = (courseId: string) => {
    setCourses(courses.map(course => {
      if (course.id === courseId) {
        return {
          ...course,
          completedLessons: course.completedLessons + 1
        };
      }
      return course;
    }));
  };

  const totalProgress = courses.length > 0
    ? courses.reduce((sum, course) => sum + course.completedLessons / course.totalLessons, 0) / courses.length
    : 0;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Learning Journey Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Your Learning Journey</Text>
            <Text style={styles.progressPercentage}>
              {Math.round(totalProgress * 100)}% Complete
            </Text>
          </View>
          <ProgressBar progress={totalProgress} />

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#eef2ff' }]}>
                <Ionicons name="play-outline" size={24} color="#6366f1" />
              </View>
              <Text style={[styles.statValue, { color: '#6366f1' }]}>
                {courses.reduce((sum, course) => sum + course.completedLessons, 0)}
              </Text>
              <Text style={styles.statLabel}>Lessons Completed</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="bookmark-outline" size={24} color="#f59e0b" />
              </View>
              <Text style={[styles.statValue, { color: '#f59e0b' }]}>
                {courses.length}
              </Text>
              <Text style={styles.statLabel}>Active Courses</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#d1fae5' }]}>
                <Ionicons name="bar-chart-outline" size={24} color="#10b981" />
              </View>
              <Text style={[styles.statValue, { color: '#10b981' }]}>
                {commuteTime * 2}
              </Text>
              <Text style={styles.statLabel}>Minutes/Day</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#ede9fe' }]}>
                <Ionicons name="trophy-outline" size={24} color="#8b5cf6" />
              </View>
              <Text style={[styles.statValue, { color: '#8b5cf6' }]}>0</Text>
              <Text style={styles.statLabel}>Achievements</Text>
            </View>
          </View>
        </View>

        {/* Premium Banner */}
        <PremiumBanner />

        {/* Your Courses */}
        <Text style={styles.sectionTitle}>Your Courses</Text>
        <View style={styles.coursesGrid}>
          {courses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              onStartLesson={() => startLesson(course.id)}
            />
          ))}
        </View>

        {/* Premium Courses */}
        <View style={styles.premiumHeader}>
          <Ionicons name="star-outline" size={20} color="#f59e0b" style={styles.premiumIcon} />
          <Text style={styles.sectionTitle}>Premium Courses</Text>
        </View>
        <View style={styles.coursesGrid}>
          {premiumCourses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              onStartLesson={() => { }}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 32,
  },
  progressCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  progressPercentage: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 16,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  coursesGrid: {
    marginBottom: 32,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumIcon: {
    marginRight: 8,
  },
});
