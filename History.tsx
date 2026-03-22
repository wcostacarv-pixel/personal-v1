import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';

interface WorkoutPlan {
  id: string;
  name: string;
  student_id: string;
  letter?: string;
}

interface WorkoutPlanExercise {
  id?: string;
  exercise_id: string;
  sets: number;
  reps: string;
  weight: string;
  order_index: number;
  exercise?: any;
}

interface TrainingContextType {
  isTrainingActive: boolean;
  isModalVisible: boolean;
  activePlan: WorkoutPlan | null;
  activeSessionId: string | null;
  trainingDuration: number;
  trainingExercises: WorkoutPlanExercise[];
  completedExercises: Set<string>;
  startTraining: (plan: WorkoutPlan, exercises: WorkoutPlanExercise[]) => void;
  toggleExercise: (exerciseId: string) => void;
  finishTraining: () => Promise<void>;
  cancelTraining: () => void;
  hideModal: () => void;
  showModal: () => void;
  formatDuration: (seconds: number) => string;
}

const TrainingContext = createContext<TrainingContextType | undefined>(undefined);

export function TrainingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isTrainingActive, setIsTrainingActive] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [trainingStartTime, setTrainingStartTime] = useState<Date | null>(null);
  const [trainingDuration, setTrainingDuration] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [trainingExercises, setTrainingExercises] = useState<WorkoutPlanExercise[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTrainingActive && trainingStartTime) {
      interval = setInterval(() => {
        setTrainingDuration(Math.floor((new Date().getTime() - trainingStartTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTrainingActive, trainingStartTime]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startTraining = async (plan: WorkoutPlan, exercises: WorkoutPlanExercise[]) => {
    if (!user) return;
    
    try {
      // 1. Create session record at start
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert([{
          professional_id: user.id,
          student_id: plan.student_id,
          workout_plan_id: plan.id,
          duration_seconds: 0,
          letter: plan.letter || 'A',
          active: true
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      setActiveSessionId(data.id);
      setActivePlan(plan);
      setTrainingExercises(exercises);
      setCompletedExercises(new Set());
      setTrainingStartTime(new Date());
      setTrainingDuration(0);
      setIsTrainingActive(true);
      setIsModalVisible(true);
    } catch (error) {
      console.error('Error starting training session:', error);
      alert('Erro ao iniciar sessão de treino no banco de dados.');
    }
  };

  const toggleExercise = (exerciseId: string) => {
    setCompletedExercises(prev => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
      }
      return newSet;
    });
  };

  const finishTraining = async () => {
    if (!activePlan || !user || !activeSessionId) {
      console.error('Cannot finish training: missing activePlan, user or activeSessionId', { activePlan, user, activeSessionId });
      return;
    }
    
    try {
      // 1. Update session record
      const { error: sessionError } = await supabase
        .from('workout_sessions')
        .update({
          duration_seconds: trainingDuration,
          completed_at: new Date().toISOString(),
          active: false
        })
        .eq('id', activeSessionId);
        
      if (sessionError) {
        console.error('Supabase update error:', sessionError);
        alert(`Erro do Supabase ao finalizar treino: ${JSON.stringify(sessionError)}`);
        return;
      }

      // 2. Increment sessions_count in workout_plans
      const { data: planData, error: fetchError } = await supabase
        .from('workout_plans')
        .select('sessions_count')
        .eq('id', activePlan.id)
        .single();

      if (!fetchError && planData) {
        await supabase
          .from('workout_plans')
          .update({ sessions_count: (planData.sessions_count || 0) + 1 })
          .eq('id', activePlan.id);
      }
      
      setIsTrainingActive(false);
      setIsModalVisible(false);
      setActivePlan(null);
      setActiveSessionId(null);
      setTrainingDuration(0);
      alert('Treino concluído com sucesso!');
      window.dispatchEvent(new Event('trainingFinished'));
    } catch (error) {
      console.error('Error finishing training:', error);
      alert(`Erro inesperado ao finalizar treino: ${JSON.stringify(error)}`);
    }
  };

  const cancelTraining = async () => {
    if (activeSessionId) {
      // Optionally delete the started session if cancelled
      await supabase.from('workout_sessions').delete().eq('id', activeSessionId);
    }
    setIsTrainingActive(false);
    setIsModalVisible(false);
    setActivePlan(null);
    setActiveSessionId(null);
    setTrainingDuration(0);
  };

  const hideModal = () => setIsModalVisible(false);
  const showModal = () => setIsModalVisible(true);

  return (
    <TrainingContext.Provider value={{
      isTrainingActive,
      isModalVisible,
      activePlan,
      activeSessionId,
      trainingDuration,
      trainingExercises,
      completedExercises,
      startTraining,
      toggleExercise,
      finishTraining,
      cancelTraining,
      hideModal,
      showModal,
      formatDuration
    }}>
      {children}
    </TrainingContext.Provider>
  );
}

export function useTraining() {
  const context = useContext(TrainingContext);
  if (context === undefined) {
    throw new Error('useTraining must be used within a TrainingProvider');
  }
  return context;
}
