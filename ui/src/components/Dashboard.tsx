import React, { useEffect, useState } from 'react';
import { PlayCircleIcon, BookmarkIcon, BarChart3Icon, AwardIcon, CrownIcon } from 'lucide-react';
import { CourseCard } from './CourseCard';
import { ProgressBar } from './ProgressBar';
import { PremiumBanner } from './PremiumBanner';
export const Dashboard = ({
  userData
}) => {
  const {
    commuteTime,
    selectedSubjects
  } = userData;
  const [courses, setCourses] = useState([]);
  const [premiumCourses, setPremiumCourses] = useState([]);
  useEffect(() => {
    // Simulate API call to generate courses based on selected subjects and commute time
    const generatedCourses = selectedSubjects.map(subject => ({
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
    const generatedPremiumCourses = [{
      id: 'premium-1',
      title: 'Advanced Language Mastery',
      subject: 'Premium Course',
      icon: selectedSubjects[0]?.icon,
      color: 'bg-amber-100 text-amber-600',
      totalLessons: 12,
      completedLessons: 0,
      nextLesson: {
        title: 'Expert-Curated Language Techniques',
        duration: Math.min(commuteTime, 20)
      },
      isPremium: true
    }, {
      id: 'premium-2',
      title: 'Career Certification Path',
      subject: 'Premium Course',
      icon: selectedSubjects[1]?.icon || selectedSubjects[0]?.icon,
      color: 'bg-amber-100 text-amber-600',
      totalLessons: 15,
      completedLessons: 0,
      nextLesson: {
        title: 'Industry-Recognized Skills',
        duration: Math.min(commuteTime, 18)
      },
      isPremium: true
    }];
    setCourses(generatedCourses);
    setPremiumCourses(generatedPremiumCourses);
  }, [selectedSubjects, commuteTime]);
  const startLesson = courseId => {
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
  const totalProgress = courses.length > 0 ? courses.reduce((sum, course) => sum + course.completedLessons / course.totalLessons, 0) / courses.length : 0;
  return <div className="max-w-4xl mx-auto mt-8">
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Your Learning Journey</h2>
          <div className="text-sm text-gray-500">
            {Math.round(totalProgress * 100)}% Complete
          </div>
        </div>
        <ProgressBar progress={totalProgress} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="bg-indigo-50 p-4 rounded-lg text-center">
            <div className="flex justify-center mb-2">
              <PlayCircleIcon className="text-indigo-600" size={24} />
            </div>
            <div className="text-2xl font-bold text-indigo-600">
              {courses.reduce((sum, course) => sum + course.completedLessons, 0)}
            </div>
            <div className="text-xs text-gray-600">Lessons Completed</div>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg text-center">
            <div className="flex justify-center mb-2">
              <BookmarkIcon className="text-amber-600" size={24} />
            </div>
            <div className="text-2xl font-bold text-amber-600">
              {courses.length}
            </div>
            <div className="text-xs text-gray-600">Active Courses</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="flex justify-center mb-2">
              <BarChart3Icon className="text-green-600" size={24} />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {commuteTime * 2}
            </div>
            <div className="text-xs text-gray-600">Minutes/Day</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="flex justify-center mb-2">
              <AwardIcon className="text-purple-600" size={24} />
            </div>
            <div className="text-2xl font-bold text-purple-600">0</div>
            <div className="text-xs text-gray-600">Achievements</div>
          </div>
        </div>
      </div>
      <PremiumBanner />
      <h3 className="text-xl font-bold mb-4">Your Courses</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courses.map(course => <CourseCard key={course.id} course={course} onStartLesson={() => startLesson(course.id)} />)}
      </div>
      <h3 className="text-xl font-bold mt-8 mb-4 flex items-center">
        <CrownIcon size={20} className="text-amber-500 mr-2" />
        Premium Courses
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {premiumCourses.map(course => <CourseCard key={course.id} course={course} onStartLesson={() => {}} />)}
      </div>
    </div>;
};