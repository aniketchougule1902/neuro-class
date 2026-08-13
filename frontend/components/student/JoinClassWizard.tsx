import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../database/supabase';
import { useAuth } from '../../context/AuthContext';
import { CameraService } from '../../services/ml/CameraService';
import { LocalMLService } from '../../services/ml/LocalMLService';
import { cn } from '../../lib/utils';

interface JoinClassWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const JoinClassWizard: React.FC<JoinClassWizardProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [joinCode, setJoinCode] = useState('');
  
  // Registration Data
  const [studentDetails, setStudentDetails] = useState({
    name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
    rollNumber: '',
    phoneNumber: '',
    faceSamples: [] as string[]
  });

  const [isCapturing, setIsCapturing] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stop camera when closing or changing steps away from step 3
  useEffect(() => {
    if (!isOpen || step !== 3) {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
        setIsCapturing(false);
      }
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const startCapture = async () => {
    try {
      setIsCapturing(true);
      const newStream = await CameraService.startCamera();
      setStream(newStream);
    } catch (e) {
      setIsCapturing(false);
      setError('Camera access denied or failed to start.');
    }
  };

  const captureSample = () => {
    if (videoRef.current && canvasRef.current) {
      const frame = CameraService.captureFrame(videoRef.current);
      if (!frame) return;
      
      setStudentDetails(prev => ({
        ...prev,
        faceSamples: [...prev.faceSamples, `data:image/jpeg;base64,${frame}`].slice(-5)
      }));
    }
  };

  const handleJoinClassroom = async () => {
    if (studentDetails.faceSamples.length < 5) {
      setError('Please capture all 5 face samples first.');
      return;
    }
    if (!user) {
      setError('You must be logged in.');
      return;
    }

    setIsRegistering(true);
    setError(null);
    
    try {
      // Generate the descriptor from the live camera frame. The attendance
      // matcher uses this compact vector; raw samples remain available for
      // user-facing enrollment evidence.
      if (!videoRef.current) throw new Error('Camera is not active. Please return to the biometrics step.');
      await LocalMLService.loadModels();
      const faceDescriptor = await LocalMLService.getFaceDescriptor(videoRef.current);
      if (!faceDescriptor) throw new Error('No face detected. Look directly at the camera and try again.');

      // 1. Lookup Classroom
      const sanitizedCode = joinCode.trim().toUpperCase();
      const { data: classroom, error: classErr } = await supabase
        .from('classrooms')
        .select('*')
        .eq('code', sanitizedCode)
        .single();
      
      if (classErr || !classroom) {
        throw new Error('Classroom not found. Please check the 6-character code.');
      }

      // 2. Insert into Students with Biometrics and user_id!
      const { error: enrollErr } = await supabase
        .from('students')
        .insert({
          classroom_id: classroom.id,
          user_id: user.id, // Fixed: properly link to auth user
          name: studentDetails.name,
          roll_number: studentDetails.rollNumber,
          phone: studentDetails.phoneNumber,
          email: user.email || '',
          face_samples: studentDetails.faceSamples,
          face_descriptor: JSON.stringify(Array.from(faceDescriptor)),
          joined_at: new Date().toISOString()
        });
      
      if (enrollErr) {
        if (enrollErr.message?.includes('unique')) {
           throw new Error('You are already enrolled in this classroom.');
        }
        throw enrollErr;
      }

      // 3. Update Classroom student count
      await supabase
        .from('classrooms')
        .update({ students: (classroom.students || 0) + 1 })
        .eq('id', classroom.id);

      onSuccess();
      onClose();
      setStep(1); // Reset
    } catch (e: any) {
      setError(e.message || 'Enrollment failed.');
    } finally {
      setIsRegistering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-xl bg-white dark:bg-[#0a0a0a] rounded-[32px] border border-slate-200 dark:border-white/10 p-10 shadow-2xl overflow-hidden relative"
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-light tracking-tight text-slate-900 dark:text-white">Join Classroom</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-100 dark:bg-white/10">
              <motion.div 
                className="h-full bg-purple-600"
                initial={{ width: 0 }}
                animate={{ width: step >= i ? '100%' : '0%' }}
                transition={{ duration: 0.3 }}
              />
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Classroom Code</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. A1B2C3" 
                    maxLength={6}
                    className="w-full mt-2 px-6 py-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/50 font-mono tracking-widest text-center text-xl"
                  />
                </div>
                <button 
                  onClick={() => { setError(null); if (joinCode.length === 6) setStep(2); else setError('Enter a valid 6-character code.'); }}
                  className="w-full py-5 rounded-3xl bg-purple-600 text-white font-bold uppercase tracking-widest text-[11px] shadow-lg shadow-purple-500/20 hover:bg-purple-500 transition-all flex items-center justify-center gap-2"
                >
                  Next Step <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Full Name</label>
                  <input 
                    type="text" 
                    value={studentDetails.name}
                    onChange={(e) => setStudentDetails({...studentDetails, name: e.target.value})}
                    className="w-full mt-2 px-6 py-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-transparent outline-none focus:border-purple-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Roll Number / Student ID</label>
                  <input 
                    type="text" 
                    value={studentDetails.rollNumber}
                    onChange={(e) => setStudentDetails({...studentDetails, rollNumber: e.target.value})}
                    className="w-full mt-2 px-6 py-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-transparent outline-none focus:border-purple-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone Number (Optional)</label>
                  <input 
                    type="tel" 
                    value={studentDetails.phoneNumber}
                    onChange={(e) => setStudentDetails({...studentDetails, phoneNumber: e.target.value})}
                    className="w-full mt-2 px-6 py-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-transparent outline-none focus:border-purple-500/50"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white font-bold uppercase tracking-widest text-[11px]">Back</button>
                  <button 
                    onClick={() => { setError(null); if (studentDetails.name && studentDetails.rollNumber) setStep(3); else setError('Name and Roll Number are required.'); }}
                    className="flex-1 py-4 rounded-2xl bg-purple-600 text-white font-bold uppercase tracking-widest text-[11px]"
                  >
                    Biometrics
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-sm font-bold uppercase tracking-widest text-purple-500 mb-2">Face-ID Enrollment</p>
                  <p className="text-xs text-slate-500">Capture 5 varied angles of your face for automated attendance and proctoring during exams.</p>
                </div>

                <div className="relative aspect-video bg-black rounded-[24px] overflow-hidden border border-white/10 shadow-inner flex items-center justify-center">
                  {!isCapturing ? (
                    <button 
                      onClick={startCapture}
                      className="flex flex-col items-center gap-3 text-white/50 hover:text-white transition-colors p-8"
                    >
                      <Camera size={48} className="opacity-50" />
                      <span className="text-xs font-bold uppercase tracking-widest">Enable Camera</span>
                    </button>
                  ) : (
                    <>
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                      <canvas ref={canvasRef} className="hidden" width={640} height={480} />
                      <div className="absolute inset-0 pointer-events-none border-[4px] border-purple-500/30 rounded-[24px]" />
                    </>
                  )}
                </div>

                {isCapturing && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      {[0, 1, 2, 3, 4].map(i => (
                        <div key={i} className="flex-1 aspect-square rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 overflow-hidden relative">
                          {studentDetails.faceSamples[i] ? (
                            <img src={studentDetails.faceSamples[i]} className="w-full h-full object-cover" alt={`Sample ${i}`} />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                              <Camera size={16} className="opacity-30" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {studentDetails.faceSamples.length < 5 ? (
                      <button 
                        onClick={captureSample}
                        className="w-full py-4 rounded-2xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/20 font-bold uppercase tracking-widest text-[11px]"
                      >
                        Capture Sample ({studentDetails.faceSamples.length}/5)
                      </button>
                    ) : (
                      <button 
                        onClick={handleJoinClassroom}
                        disabled={isRegistering}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-500 text-white font-bold uppercase tracking-widest text-[11px] shadow-lg shadow-emerald-500/30"
                      >
                        {isRegistering ? 'Registering...' : <><CheckCircle2 size={16} /> Complete Registration</>}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
