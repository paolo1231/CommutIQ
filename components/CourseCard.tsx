import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProgressBar } from './ProgressBar';

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

interface CourseCardProps {
  course: Course;
  onStartLesson: () => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, onStartLesson }) => {
  const {
    title,
    subject,
    totalLessons,
    completedLessons,
    nextLesson,
    color,
    icon,
    isPremium
  } = course;

  const progress = completedLessons / totalLessons;

  return (
    <View style={styles.card}>
      <View style={[styles.header, { backgroundColor: color.background }]}>
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={20} color={color.text} />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subject}>{subject}</Text>
          </View>
        </View>
        {isPremium && (
          <View style={styles.premiumBadge}>
            <Ionicons name="star-outline" size={12} color="white" style={styles.premiumIcon} />
            <Text style={styles.premiumText}>Premium</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressStats}>
              {completedLessons}/{totalLessons} lessons
            </Text>
          </View>
          <ProgressBar progress={progress} />
        </View>

        <View style={styles.nextLessonSection}>
          <Text style={styles.nextLessonLabel}>Next up:</Text>
          <Text style={styles.nextLessonTitle}>{nextLesson.title}</Text>
          <Text style={styles.nextLessonInfo}>
            {nextLesson.duration} min · Audio Lesson
          </Text>

          <TouchableOpacity
            onPress={onStartLesson}
            style={[
              styles.startButton,
              isPremium ? styles.premiumButton : styles.regularButton
            ]}
          >
            <Ionicons
              name={isPremium ? "lock-closed-outline" : "play-outline"}
              size={16}
              color="white"
              style={styles.buttonIcon}
            />
            <Text style={styles.buttonText}>
              {isPremium ? "Unlock Lesson" : "Start Lesson"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
    marginBottom: 16,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    color: '#1f2937',
    fontSize: 16,
  },
  subject: {
    fontSize: 14,
    color: '#6b7280',
  },
  premiumBadge: {
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumIcon: {
    marginRight: 4,
  },
  premiumText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressStats: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  nextLessonSection: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 16,
  },
  nextLessonLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  nextLessonTitle: {
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  nextLessonInfo: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
  },
  regularButton: {
    backgroundColor: '#4f46e5',
  },
  premiumButton: {
    backgroundColor: '#f59e0b',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
  },
});
