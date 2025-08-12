import React from 'react';
export const ProgressBar = ({
  progress
}) => {
  const percentage = Math.min(Math.max(progress * 100, 0), 100);
  return <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out" style={{
      width: `${percentage}%`
    }} />
    </div>;
};