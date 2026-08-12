import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { ClassroomList } from './ClassroomList';
import { ClassroomDetail } from './ClassroomDetail';
import { ProtocolDashboard } from './x402/ProtocolDashboard';
import { TestDesigner } from './TestDesigner';

export const InstructorDashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState('classrooms');
  const [isSidebarHovered, setSidebarHovered] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const handleSelectClass = (id: string) => {
    setSelectedClassId(id);
    setActiveSection('classroom-detail');
  };

  const renderContent = () => {
    if (activeSection === 'classroom-detail' && selectedClassId) {
      return <ClassroomDetail classroomId={selectedClassId} onBack={() => setActiveSection('classrooms')} />;
    }
    
    switch (activeSection) {
      case 'classrooms':
        return <ClassroomList onSelect={handleSelectClass} />;
      case 'dashboard':
        return (
          <div className="p-8">
            <h2 className="text-3xl font-black mb-4">Dashboard Overview</h2>
            <p className="text-slate-500">Welcome to your premium instructor portal.</p>
          </div>
        );
      case 'x402':
        return <ProtocolDashboard />;
      case 'tests':
        return <TestDesigner />;
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
         <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2" />
         <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[150px] translate-y-1/2 -translate-x-1/2" />
      </div>

      <Sidebar 
        activeSection={activeSection} 
        setActiveSection={setActiveSection} 
        isHovered={isSidebarHovered} 
        setHovered={setSidebarHovered} 
      />
      
      <main 
        className="flex-1 relative z-10 transition-all duration-500 overflow-hidden bg-white/50 dark:bg-black/20 backdrop-blur-3xl border-l border-black/5 dark:border-white/10"
        style={{ marginLeft: isSidebarHovered ? '16rem' : '5rem' }}
      >
        {renderContent()}
      </main>
    </div>
  );
};
