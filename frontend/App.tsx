/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/common/Navbar';
import ParticleBackground from './components/common/ParticleBackground';
import { Hero } from './components/common/Hero';
import Features from './components/common/Features';
import { Process, DashboardPreview } from './components/common/WorkAndDashboard';
import { TestSystem, Footer } from './components/common/TestAndFooter';
import { ClassroomView } from './components/classroom/ClassroomView';
import { StudentPortal } from './components/classroom/StudentPortal';
import { AIModuleDashboard } from './components/ai/AIModuleDashboard';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle } from 'lucide-react';
import { AuthModal } from './components/auth/AuthModal';
import { supabase, isSupabaseConfigured } from './database/supabase';
import { authService, AppUser } from '../backend/auth';
import { logPageView } from './database/analytics';

const MissingConfigMessage = ({ onBack }: { onBack: () => void }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-black px-4 py-20 overflow-y-auto">
    <div className="max-w-md w-full space-y-6 text-center bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-2xl">
      <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto">
        <AlertCircle size={32} />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Database Not Configured</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          The Supabase credentials (<code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code>) are missing.
        </p>
      </div>
      <button
        onClick={onBack}
        className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-black font-bold uppercase tracking-widest text-[10px] rounded-2xl hover:opacity-90 transition-opacity"
      >
        Back to Home
      </button>
    </div>
  </div>
);

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'classroom' | 'student'>('home');
  const [showAIModule, setShowAIModule] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState<'teacher' | 'student' | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    logPageView(window.location.pathname);
    
    const unsubscribe = authService.subscribeToAuthState(async (currentUser) => {
      setUser(currentUser);
      if (currentUser && 'id' in currentUser) {
        const role = await authService.getUserRole(currentUser.id);
        setUserRole(role);
      } else {
        setUserRole(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (role: 'teacher' | 'student') => {
    try {
      setIsAuthModalOpen(false);
      setAuthLoading(true);
      const authUser = await authService.loginWithGoogleOAuth(role);
      const newRole = await authService.getUserRole(authUser.id);
      setUserRole(newRole);
      setActiveTab(newRole === 'student' ? 'student' : 'classroom');
    } catch (e) {
      console.error('Google OAuth Sign-In Error:', e);
      alert('Sign in failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setUserRole(null);
      setActiveTab('home');
    } catch (e) {
      console.error('Sign Out Error:', e);
    }
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white selection:bg-blue-500 selection:text-white relative transition-colors duration-300 font-sans">
        <ParticleBackground />

        <Navbar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          setShowAIModule={setShowAIModule}
          user={user}
          onLogin={() => setIsAuthModalOpen(true)}
          onLaunch={() => {
            if (!user) setIsAuthModalOpen(true);
            else setActiveTab(userRole === 'student' ? 'student' : 'classroom');
          }}
          onLogout={handleLogout}
        />

        <main className="relative z-10">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Hero onLaunch={() => {
                  if (!user) setIsAuthModalOpen(true);
                  else setActiveTab(userRole === 'student' ? 'student' : 'classroom');
                }} />
                <Features />
                <Process />
                <DashboardPreview />
                <TestSystem />
                <Footer />
              </motion.div>
            )}

            {activeTab === 'classroom' && (
              <motion.div
                key="classroom"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {!isSupabaseConfigured() ? (
                  <MissingConfigMessage onBack={() => setActiveTab('home')} />
                ) : (
                  <ClassroomView />
                )}
              </motion.div>
            )}

            {activeTab === 'student' && (
              <motion.div
                key="student"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {!isSupabaseConfigured() ? (
                  <MissingConfigMessage onBack={() => setActiveTab('home')} />
                ) : (
                  <StudentPortal />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <AnimatePresence>
          {showAIModule && (
            <AIModuleDashboard onClose={() => setShowAIModule(false)} />
          )}
        </AnimatePresence>
        
        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
          onSelectRole={handleLogin} 
        />
      </div>
    </ThemeProvider>
  );
}

export default App;
