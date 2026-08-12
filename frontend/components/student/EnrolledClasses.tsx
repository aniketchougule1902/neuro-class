import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, BookOpen, Users } from 'lucide-react';
import { supabase } from '../../database/supabase';
import { useAuth } from '../../context/AuthContext';

interface EnrolledClassesProps {
  onJoinClick: () => void;
}

export const EnrolledClasses: React.FC<EnrolledClassesProps> = ({ onJoinClick }) => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnrollments = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*, classrooms(*)')
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false });

        if (error) throw error;
        
        // Ensure uniqueness by classroom ID
        const unique = data ? Array.from(new Map(data.map((item: any) => [item.classroom_id, item])).values()) : [];
        setClasses(unique);
      } catch (err) {
        console.error('Error fetching enrollments:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEnrollments();
  }, [user]);

  return (
    <div className="p-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight mb-2">My Classes</h2>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Enrolled Instances</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onJoinClick}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-purple-600 text-white font-bold uppercase tracking-widest text-[11px] shadow-lg shadow-purple-500/30 hover:bg-purple-500 transition-colors"
        >
          <Plus size={16} />
          Join Class
        </motion.button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
          <BookOpen size={48} className="text-slate-300 dark:text-white/20 mb-4" />
          <h3 className="text-lg font-bold">No enrolled classes</h3>
          <p className="text-slate-500 text-sm mb-6">Ask your instructor for a 6-character classroom code.</p>
          <button onClick={onJoinClick} className="text-purple-500 font-bold hover:underline">Join a class</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((enrollment, index) => {
            const cls = enrollment.classrooms;
            if (!cls) return null;
            return (
              <motion.div
                key={enrollment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group cursor-pointer bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[24px] p-6 hover:shadow-2xl hover:border-purple-500/30 transition-all"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    {cls.name.substring(0, 1).toUpperCase()}
                  </div>
                  <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20">
                    Enrolled
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-purple-500 transition-colors">{cls.name}</h3>
                <div className="flex items-center gap-6 mt-6 pt-6 border-t border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-slate-400" />
                    <span className="text-sm font-semibold">{cls.students || 0} Classmates</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
