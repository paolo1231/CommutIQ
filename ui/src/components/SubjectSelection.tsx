import React, { useState } from 'react';
import { BookIcon, GlobeIcon, BrainIcon, HistoryIcon, MusicIcon, CodeIcon } from 'lucide-react';
export const SubjectSelection = ({
  commuteTime,
  onComplete
}) => {
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const subjects = [{
    id: 1,
    name: 'Languages',
    icon: GlobeIcon,
    color: 'bg-blue-100 text-blue-600'
  }, {
    id: 2,
    name: 'Chess',
    icon: BrainIcon,
    color: 'bg-amber-100 text-amber-600'
  }, {
    id: 3,
    name: 'History',
    icon: HistoryIcon,
    color: 'bg-green-100 text-green-600'
  }, {
    id: 4,
    name: 'Music Theory',
    icon: MusicIcon,
    color: 'bg-purple-100 text-purple-600'
  }, {
    id: 5,
    name: 'Programming',
    icon: CodeIcon,
    color: 'bg-red-100 text-red-600'
  }, {
    id: 6,
    name: 'Literature',
    icon: BookIcon,
    color: 'bg-teal-100 text-teal-600'
  }];
  const toggleSubject = id => {
    if (selectedSubjects.includes(id)) {
      setSelectedSubjects(selectedSubjects.filter(subjectId => subjectId !== id));
    } else {
      setSelectedSubjects([...selectedSubjects, id]);
    }
  };
  const handleContinue = () => {
    const selected = subjects.filter(subject => selectedSubjects.includes(subject.id));
    onComplete(selected);
  };
  return <div className="max-w-2xl mx-auto mt-12">
      <h2 className="text-2xl font-bold mb-2">What would you like to learn?</h2>
      <p className="text-gray-600 mb-8">
        Select subjects you're interested in learning during your {commuteTime}
        -minute commute. We'll create personalized micro-lessons for you.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {subjects.map(subject => {
        const Icon = subject.icon;
        const isSelected = selectedSubjects.includes(subject.id);
        return <div key={subject.id} className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`} onClick={() => toggleSubject(subject.id)}>
              <div className={`w-12 h-12 rounded-full ${subject.color} flex items-center justify-center mb-3`}>
                <Icon size={24} />
              </div>
              <h3 className="font-medium">{subject.name}</h3>
            </div>;
      })}
      </div>
      <button onClick={handleContinue} disabled={selectedSubjects.length === 0} className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${selectedSubjects.length > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
        Create My Learning Plan
      </button>
    </div>;
};