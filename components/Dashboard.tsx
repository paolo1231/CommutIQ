import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CourseCard } from './CourseCard';
import { ProgressBar } from './ProgressBar';
import { PremiumBanner } from './PremiumBanner';

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

  const statsData = [
    {
      icon: 'play-outline' as keyof typeof Ionicons.glyphMap,
      value: courses.reduce((sum, course) => sum + course.completedLessons, 0),
      label: 'Lessons Completed',
      color: '#4f46e5',
      background: '#eef2ff'
    },
    {
      icon: 'bookmark-outline' as keyof typeof Ionicons.glyphMap,
      value: courses.length,
      label: 'Active Courses',
      color: '#f59e0b',
      background: '#fef3c7'
    },
    {
      icon: 'bar-chart-outline' as keyof typeof Ionicons.glyphMap,
      value: commuteTime * 2,
      label: 'Minutes/Day',
      color: '#10b981',
      background: '#d1fae5'
    },
    {
      icon: 'trophy-outline' as keyof typeof Ionicons.glyphMap,
      value: 0,
      label: 'Achievements',
      color: '#8b5cf6',
      background: '#ede9fe'
    }
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Progress Overview */}
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
            {statsData.map((stat, index) => (
              <View key={index} style={[styles.statCard, { backgroundColor: stat.background }]}>
                <View style={styles.statIconContainer}>
                  <Ionicons name={stat.icon} size={24} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Premium Banner */}
        <PremiumBanner />

        {/* Your Courses */}
        <Text style={styles.sectionTitle}>Your Courses</Text>
        <View style={styles.coursesContainer}>
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
        <View style={styles.coursesContainer}>
          {premiumCourses.map(course => (
            <CourseCard 
              key={course.id} 
              course={course} 
              onStartLesson={() => {}} 
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  progressCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  progressPercentage: {
    fontSize: 14,
    color: '#6b7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  coursesContainer: {
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
