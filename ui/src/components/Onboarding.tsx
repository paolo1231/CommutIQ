import React, { useState } from 'react';
import { CarIcon, ClockIcon } from 'lucide-react';
export const Onboarding = ({
  onComplete
}) => {
  const [commuteTime, setCommuteTime] = useState(30);
  const handleSubmit = e => {
    e.preventDefault();
    onComplete(commuteTime);
  };
  return <div className="max-w-md mx-auto mt-12 bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-center mb-6">
        <div className="bg-indigo-100 p-4 rounded-full">
          <CarIcon size={32} className="text-indigo-600" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-center mb-6">
        Welcome to CommutIQ
      </h2>
      <p className="text-gray-600 mb-8 text-center">
        Turn your daily commute into a productive learning experience. Let's
        start by understanding your commute time.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-gray-700 mb-2 font-medium">
            How long is your daily commute (one way)?
          </label>
          <div className="flex items-center">
            <div className="relative flex-1">
              <input type="range" min="5" max="120" step="5" value={commuteTime} onChange={e => setCommuteTime(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
              <div className="absolute w-full flex justify-between text-xs text-gray-500 mt-2">
                <span>5m</span>
                <span>60m</span>
                <span>120m</span>
              </div>
            </div>
            <div className="ml-4 bg-indigo-100 px-3 py-2 rounded-md flex items-center">
              <ClockIcon size={16} className="text-indigo-600 mr-1" />
              <span className="font-bold text-indigo-600">
                {commuteTime} min
              </span>
            </div>
          </div>
        </div>
        <button type="submit" className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md font-medium hover:bg-indigo-700 transition-colors">
          Continue
        </button>
      </form>
    </div>;
};