import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, Users, ShieldCheck, FileText, CheckCircle2, Clock, ArrowLeft, Plus, Sparkles
} from 'lucide-react';
import { supabase } from '../../database/supabase';
import { useAuth } from '../../context/AuthContext';
import { StudentAttendanceModal } from './StudentAttendanceModal';

interface EnrolledClassDetailProps {
  classroom: any;
  onBack: () => void;
  onStartTest: (testId: string) => void;
}

export const EnrolledClassDetail: React.FC<EnrolledClassDetailProps> = ({
  classroom,
  onBack,
  onStartTest,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'tests' | 'attendance' | 'announcements'>('tests');
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);

  useEffect(() => {
    if (classroom && user) {
      fetchClassroomData();
    }
  }, [classroom, user]);

  const fetchClassroomData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Tests for this classroom
      const { data: testsData } = await supabase
        .from('tests')
        .select('*')
        .eq('classroom_id', classroom.id)
        .order('created_at', { ascending: false });

      setTests(testsData || []);

      // 2. Fetch Student Profile for this classroom
      const { data: profile } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user!.id)
        .eq('classroom_id', classroom.id)
        .single();

      if (profile) {
        const { data: attData } = await supabase
          .from('attendance')
          .select('*')
          .eq('classroom_id', classroom.id)
          .eq('student_id', profile.id)
          .order('verified_at', { ascending: false });

        setAttendanceLogs(attData || []);
      }
    } catch (e) {
      console.error('Error fetching classroom detail:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Top Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-purple-500">Enrolled Classroom</span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">{classroom.name}</h1>
        </div>
      </div>

      {/* Classroom Hero Card */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-black rounded-[36px] p-8 text-white border border-white/10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-mono font-bold uppercase tracking-widest border border-white/20">
              Code: {classroom.code}
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
              <Users size={14} /> {classroom.students || 1} Enrolled
            </span>
          </div>
          <h2 className="text-2xl font-bold">{classroom.name}</h2>
          <p className="text-xs text-slate-300">Secure proctored assessments & biometric face verification enabled.</p>
        </div>

        <button
          onClick={() => setIsAttendanceModalOpen(true)}
          className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/30 flex items-center gap-2 shrink-0 transition-all z-10"
        >
          <ShieldCheck size={16} /> Mark Facecam Attendance
        </button>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200 dark:border-white/10 gap-8">
        <button
          onClick={() => setActiveTab('tests')}
          className={`pb-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'tests' ? 'border-purple-500 text-purple-500' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <FileText size={16} /> Course Tests ({tests.length})
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'attendance' ? 'border-purple-500 text-purple-500' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <ShieldCheck size={16} /> Attendance Logs ({attendanceLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`pb-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'announcements' ? 'border-purple-500 text-purple-500' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles size={16} /> Announcements
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="p-8 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'tests' ? (
        <div className="space-y-4">
          {tests.length === 0 ? (
            <div className="p-12 border border-dashed border-black/10 dark:border-white/10 rounded-3xl text-center space-y-2 text-slate-400 text-xs">
              <FileText size={40} className="mx-auto opacity-50 mb-2" />
              <p>No tests published for this classroom yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tests.map((t) => (
                <div
                  key={t.id}
                  className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{t.description || 'Proctored assessment'}</p>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Duration: {t.duration_minutes} Mins</span>
                      <span>Marks: {t.total_marks || 100}</span>
                    </div>

                    <button
                      onClick={() => onStartTest(t.id)}
                      className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-widest text-xs shadow-lg shadow-purple-500/20 transition-colors"
                    >
                      Start Exam
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'attendance' ? (
        <div className="space-y-4">
          {attendanceLogs.length === 0 ? (
            <div className="p-12 border border-dashed border-black/10 dark:border-white/10 rounded-3xl text-center space-y-2 text-slate-400 text-xs">
              <ShieldCheck size={40} className="mx-auto opacity-50 mb-2" />
              <p>No attendance records logged for this class.</p>
              <button
                onClick={() => setIsAttendanceModalOpen(true)}
                className="text-purple-500 font-bold hover:underline"
              >
                Perform Facecam Check-In
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {attendanceLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Status: {log.status || 'Present'}</p>
                      <p className="text-xs text-slate-400">Verified via: {log.verified_method || 'Face-ID Biometric'}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(log.verified_at || log.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 border border-dashed border-black/10 dark:border-white/10 rounded-3xl text-center text-slate-400 text-xs space-y-2">
          <Sparkles size={36} className="mx-auto opacity-50" />
          <p>No announcements posted by instructor.</p>
        </div>
      )}

      {/* Attendance Check-In Modal */}
      <StudentAttendanceModal
        isOpen={isAttendanceModalOpen}
        classroomId={classroom.id}
        classroomName={classroom.name}
        onClose={() => setIsAttendanceModalOpen(false)}
        onSuccess={() => fetchClassroomData()}
      />
    </div>
  );
};
