import React, { useState } from 'react';
import { StudentSidebar } from './StudentSidebar';
import { EnrolledClasses } from './EnrolledClasses';
import { JoinClassWizard } from './JoinClassWizard';

export const StudentDashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState('classes');
  const [isSidebarHovered, setSidebarHovered] = useState(false);
  const [isJoinWizardOpen, setJoinWizardOpen] = useState(false);

  const renderContent = () => {
    switch (activeSection) {
      case 'classes':
        return <EnrolledClasses onJoinClick={() => setJoinWizardOpen(true)} />;
      case 'dashboard':
        return (
          <div className="p-8">
            <h2 className="text-3xl font-black mb-4">Student Overview</h2>
            <p className="text-slate-500">Welcome to your secure learning environment.</p>
          </div>
        );
      case 'tests':
        return (
          <div className="p-8">
            <h2 className="text-3xl font-black mb-4">Active Tests</h2>
            <p className="text-slate-500">Pending assignments and exams will appear here.</p>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full text-slate-400 font-bold uppercase tracking-widest text-sm">
            {activeSection} - Work in Progress
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white flex font-sans overflow-hidden">
      {/* Background Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 z-0">
         <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[150px] -translate-y-1/2 -translate-x-1/2" />
         <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[150px] translate-y-1/2 translate-x-1/2" />
      </div>

      <StudentSidebar 
        activeSection={activeSection} 
        setActiveSection={setActiveSection} 
        isHovered={isSidebarHovered} 
        setHovered={setSidebarHovered} 
      />
      
      <main 
        className="flex-1 relative z-10 transition-all duration-500 overflow-y-auto bg-white/50 dark:bg-black/20 backdrop-blur-3xl border-l border-black/5 dark:border-white/10"
        style={{ marginLeft: isSidebarHovered ? '16rem' : '5rem' }}
      >
        {renderContent()}
      </main>

      {/* The Biometric Join Wizard */}
      <JoinClassWizard 
        isOpen={isJoinWizardOpen} 
        onClose={() => setJoinWizardOpen(false)} 
        onSuccess={() => {
          // Force EnrolledClasses to re-fetch by toggling section or using a key
          // For now, it will remount when closed or we could pass a refresh trigger
          setActiveSection('dashboard');
          setTimeout(() => setActiveSection('classes'), 50);
        }}
      />
    </div>
  );
};
