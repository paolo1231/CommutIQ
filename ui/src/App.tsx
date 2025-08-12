import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Onboarding } from './components/Onboarding';
import { SubjectSelection } from './components/SubjectSelection';
import { Dashboard } from './components/Dashboard';
export function App() {
  const [step, setStep] = useState('onboarding');
  const [userData, setUserData] = useState({
    commuteTime: 0,
    selectedSubjects: [],
    progress: {}
  });
  const updateUserData = data => {
    setUserData(prev => ({
      ...prev,
      ...data
    }));
  };
  return <Layout>
      {step === 'onboarding' && <Onboarding onComplete={commuteTime => {
      updateUserData({
        commuteTime
      });
      setStep('subject-selection');
    }} />}
      {step === 'subject-selection' && <SubjectSelection commuteTime={userData.commuteTime} onComplete={selectedSubjects => {
      updateUserData({
        selectedSubjects
      });
      setStep('dashboard');
    }} />}
      {step === 'dashboard' && <Dashboard userData={userData} updateUserData={updateUserData} />}
    </Layout>;
}