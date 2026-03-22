import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, Dumbbell, Search, Filter, X } from 'lucide-react';

interface WorkoutSession {
  id: string;
  student_id: string;
  workout_plan_id: string;
  duration_seconds: number;
  completed_at: string;
  letter: string;
  student: { name: string };
  plan: { name: string };
}

export default function History() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [students, setStudents] = useState<{ id: string, name: string }[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('workout_sessions')
        .select(`
          id,
          student_id,
          workout_plan_id,
          duration_seconds,
          completed_at,
          letter,
          student:students(name),
          plan:workout_plans(name)
        `)
        .eq('professional_id', user.id);

      if (selectedStudent) {
        query = query.eq('student_id', selectedStudent);
      }

      if (startDate) {
        query = query.gte('completed_at', `${startDate}T00:00:00Z`);
      }

      if (endDate) {
        query = query.lte('completed_at', `${endDate}T23:59:59Z`);
      }

      const { data, error } = await query.order('completed_at', { ascending: false });

      if (error) {
        console.error("Erro do Supabase ao buscar histórico:", error);
        throw error;
      }
      
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, name')
        .eq('professional_id', user.id)
        .order('name');
      
      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchStudents();
    fetchHistory();

    const handleTrainingFinished = () => {
      fetchHistory();
    };

    window.addEventListener('trainingFinished', handleTrainingFinished);
    return () => window.removeEventListener('trainingFinished', handleTrainingFinished);
  }, [user]);

  // Re-fetch when filters change
  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [selectedStudent, startDate, endDate]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">Histórico de Sessões</h1>
        <p className="text-zinc-400 mt-1">Acompanhe as sessões de treino concluídas pelos seus alunos</p>
      </div>

      {/* Filtros */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-6 text-zinc-100">
          <Filter className="w-5 h-5 text-lime-400" />
          <h2 className="font-semibold">Filtros de Busca</h2>
          {(selectedStudent || startDate || endDate) && (
            <button
              onClick={() => {
                setSelectedStudent('');
                setStartDate('');
                setEndDate('');
              }}
              className="ml-auto text-xs text-zinc-500 hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" />
              Limpar Filtros
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Aluno</label>
            <div className="relative">
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all appearance-none"
              >
                <option value="">Todos os Alunos</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
              <Search className="w-4 h-4 text-zinc-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Data Início</label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all"
              />
              <Calendar className="w-4 h-4 text-zinc-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Data Fim</label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all"
              />
              <Calendar className="w-4 h-4 text-zinc-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-zinc-400 text-center py-8">Carregando histórico...</div>
        ) : sessions.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center shadow-xl">
            <Dumbbell className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 text-lg">Nenhuma sessão encontrada para este filtro.</p>
            {(selectedStudent || startDate || endDate) && (
              <button
                onClick={() => {
                  setSelectedStudent('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="mt-4 text-lime-400 hover:text-lime-300 font-medium transition-colors"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-800/50 border-b border-zinc-800 text-zinc-400 text-sm">
                    <th className="p-4 font-medium">Nome do Aluno</th>
                    <th className="p-4 font-medium">Nome da Ficha</th>
                    <th className="p-4 font-medium">Data</th>
                    <th className="p-4 font-medium">Duração</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 text-zinc-100 font-medium">
                        {session.student?.name || 'Aluno Excluído'}
                      </td>
                      <td className="p-4 text-zinc-300">
                        <div className="flex items-center gap-2">
                          <Dumbbell className="w-4 h-4 text-zinc-500" />
                          {session.plan?.name || 'Ficha Excluída'}
                          {session.letter && (
                            <span className="px-2 py-0.5 bg-lime-400/10 text-lime-400 text-[10px] font-bold rounded border border-lime-400/20">
                              FICHA {session.letter}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-zinc-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(session.completed_at), "dd/MM/yyyy 'às' HH:mm")}
                        </div>
                      </td>
                      <td className="p-4 text-zinc-400">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {formatDuration(session.duration_seconds)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
