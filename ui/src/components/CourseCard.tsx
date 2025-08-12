import React, { Component } from 'react';
import { PlayIcon, BookOpenIcon, LockIcon, CrownIcon } from 'lucide-react';
import { ProgressBar } from './ProgressBar';
export const CourseCard = ({
  course,
  onStartLesson
}) => {
  const {
    title,
    subject,
    totalLessons,
    completedLessons,
    nextLesson,
    color,
    isPremium
  } = course;
  const progress = completedLessons / totalLessons;
  const IconComponent = course.icon || BookOpenIcon;
  return <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className={`p-4 ${color.split(' ')[0]} flex items-center justify-between`}>
        <div className="flex items-center">
          <div className="bg-white rounded-full p-2 mr-3">
            <IconComponent className={color.split(' ')[1]} size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">{title}</h3>
            <div className="text-sm text-gray-600">{subject}</div>
          </div>
        </div>
        {isPremium && <div className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
            <CrownIcon size={12} className="mr-1" />
            Premium
          </div>}
      </div>
      <div className="p-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Progress</span>
          <span className="font-medium">
            {completedLessons}/{totalLessons} lessons
          </span>
        </div>
        <ProgressBar progress={progress} />
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="text-sm text-gray-600 mb-1">Next up:</div>
          <div className="font-medium mb-2">{nextLesson.title}</div>
          <div className="text-xs text-gray-500 mb-3">
            {nextLesson.duration} min · Audio Lesson
          </div>
          <button onClick={onStartLesson} className={`flex items-center justify-center w-full ${isPremium ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'} text-white py-2 px-4 rounded-md transition-colors`}>
            {isPremium ? <>
                <LockIcon size={16} className="mr-2" />
                Unlock Lesson
              </> : <>
                <PlayIcon size={16} className="mr-2" />
                Start Lesson
              </>}
          </button>
        </div>
      </div>
    </div>;
};