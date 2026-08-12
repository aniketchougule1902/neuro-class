import { supabase } from '../database/supabase';

export interface RubricCriterion {
  name: string;
  maxMarks: number;
  scoreObtained?: number;
  justification?: string;
}

export interface EvaluationRecord {
  id: string;
  type: 'test-paper' | 'assignment';
  studentName: string;
  rollNumber: string;
  subject: string;
  assessmentName: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  feedback: string;
  strengths?: string[];
  weaknesses?: string[];
  improvementSuggestions?: string[];
  criteriaScores?: RubricCriterion[];
  questionEvaluations?: any[];
  plagiarismScore?: number;
  plagiarismDetails?: string;
  date: string;
}

type Listener = () => void;
const storeListeners = new Set<Listener>();

export const subscribeToStoreChanges = (callback: Listener) => {
  storeListeners.add(callback);
  return () => {
    storeListeners.delete(callback);
  };
};

const notifyStoreListeners = () => {
  storeListeners.forEach(cb => {
    try { cb(); } catch (err) { console.error(err); }
  });
};

let isSynced = false;
export const initStoreSync = () => {
  if (isSynced) return;
  isSynced = true;

  const fetchEvaluations = async () => {
    const { data, error } = await supabase.from('evaluations').select('*');
    if (!error && data) {
      localStorage.setItem('nc_evaluations', JSON.stringify(data));
      notifyStoreListeners();
    }
  };

  fetchEvaluations();
  
  // Optional: Set up real-time subscription
  supabase.channel('evaluations_channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'evaluations' }, payload => {
      fetchEvaluations();
    })
    .subscribe();
};

export const getEvaluations = (): EvaluationRecord[] => {
  initStoreSync();
  const data = localStorage.getItem('nc_evaluations');
  return data ? JSON.parse(data) : [];
};

export const saveEvaluation = async (record: Omit<EvaluationRecord, 'id' | 'date'>): Promise<EvaluationRecord> => {
  initStoreSync();
  const id = 'e-' + Math.random().toString(36).substr(2, 9);
  const date = new Date().toISOString();
  const newRecord: EvaluationRecord = { ...record, id, date };

  const current = getEvaluations();
  localStorage.setItem('nc_evaluations', JSON.stringify([newRecord, ...current]));
  notifyStoreListeners();

  const { error } = await supabase.from('evaluations').insert(newRecord);
  if (error) {
    console.error('Failed to save evaluation to Supabase:', error);
  }

  return newRecord;
};
