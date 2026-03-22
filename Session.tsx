import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Users, Activity, DollarSign, TrendingUp, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const { user, isSuperAdmin } = useAuth();
  const [stats, setStats] = useState({
    activeStudents: 0,
    workoutsThisMonth: 0,
    estimatedRevenue: 0,
    realizedRevenue: 0,
  });
  
  const [adminStats, setAdminStats] = useState({
    expectedRevenue: 0,
    realizedRevenue: 0,
    activeProfessionals: 0,
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        if (isSuperAdmin) {
          // Fetch admin stats
          const { data: professionals } = await supabase
            .from('profiles')
            .select('monthly_fee')
            .eq('active', true);
            
          const expected = professionals?.reduce((sum, p) => sum + (Number(p.monthly_fee) || 0), 0) || 0;
          
          const now = new Date();
          const currentMonth = now.getMonth() + 1;
          const currentYear = now.getFullYear();
          
          const { data: payments } = await supabase
            .from('professional_payments')
            .select('amount')
            .eq('month', currentMonth)
            .eq('year', currentYear);
            
          const realized = payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
          
          setAdminStats({
            expectedRevenue: expected,
            realizedRevenue: realized,
            activeProfessionals: professionals?.length || 0,
          });
        } else {
          // Fetch active students
          const { count: studentsCount, data: students } = await supabase
            .from('students')
            .select('*', { count: 'exact' })
            .eq('professional_id', user.id)
            .eq('active', true);

          // Fetch workouts this month
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          const { data: workouts, count: workoutsCount } = await supabase
            .from('workouts')
            .select('student_id, end_time', { count: 'exact' })
            .eq('professional_id', user.id)
            .gte('start_time', startOfMonth.toISOString());

          // Calculate estimated revenue
          let expectedRev = 0;
          let realizedRevFromSessions = 0;
          
          if (students) {
            // Add fixed monthly fees and estimated session fees
            students.forEach(s => {
              if (s.plan_type === 'Mensalidade Fixa' && s.monthly_fee) {
                expectedRev += Number(s.monthly_fee);
              } else if (s.plan_type === 'Valor por Aula' && s.session_fee) {
                // Estimate based on frequency (e.g., "3x na semana" -> 3 * 4 weeks = 12 sessions/month)
                let sessionsPerMonth = 0;
                if (s.frequency) {
                  const match = s.frequency.match(/(\d+)x/);
                  if (match && match[1]) {
                    sessionsPerMonth = parseInt(match[1], 10) * 4;
                  }
                }
                expectedRev += Number(s.session_fee) * sessionsPerMonth;
              }
            });

            // Add session fees for completed workouts this month to realized revenue
            if (workouts) {
              workouts.forEach(w => {
                const student = students.find(s => s.id === w.student_id);
                if (student && student.plan_type === 'Valor por Aula' && student.session_fee) {
                  if (w.end_time) {
                    realizedRevFromSessions += Number(student.session_fee);
                  }
                }
              });
            }
          }
          
          // Calculate realized revenue
          const currentMonth = startOfMonth.getMonth() + 1;
          const currentYear = startOfMonth.getFullYear();
          
          const { data: payments } = await supabase
            .from('student_payments')
            .select('amount')
            .eq('professional_id', user.id)
            .eq('month', currentMonth)
            .eq('year', currentYear);
            
          const realizedRevFromMonthly = payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;

          setStats({
            activeStudents: studentsCount || 0,
            workoutsThisMonth: workoutsCount || 0,
            estimatedRevenue: expectedRev,
            realizedRevenue: realizedRevFromMonthly + realizedRevFromSessions,
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, isSuperAdmin]);

  if (loading) {
    return <div className="text-zinc-400">Carregando dashboard...</div>;
  }

  if (isSuperAdmin) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-lime-400 tracking-tight">Visão Geral do Negócio</h1>
          <p className="text-zinc-400 mt-1">Acompanhamento financeiro da plataforma SaaS</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zinc-400 font-medium">Faturamento Previsto (Mês)</h3>
              <div className="w-10 h-10 bg-lime-400/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-lime-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-zinc-100">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(adminStats.expectedRevenue)}
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zinc-400 font-medium">Faturamento Realizado (Mês)</h3>
              <div className="w-10 h-10 bg-emerald-400/10 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-emerald-400">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(adminStats.realizedRevenue)}
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zinc-400 font-medium">Personais Ativos</h3>
              <div className="w-10 h-10 bg-blue-400/10 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-zinc-100">{adminStats.activeProfessionals}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">Dashboard</h1>
        <p className="text-zinc-400 mt-1">Resumo do seu negócio fitness</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-400 font-medium">Alunos Ativos</h3>
            <div className="w-10 h-10 bg-lime-400/10 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-lime-400" />
            </div>
          </div>
          <p className="text-4xl font-bold text-zinc-100">{stats.activeStudents}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-400 font-medium">Treinos no Mês</h3>
            <div className="w-10 h-10 bg-lime-400/10 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-lime-400" />
            </div>
          </div>
          <p className="text-4xl font-bold text-zinc-100">{stats.workoutsThisMonth}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-400 font-medium">Faturamento Previsto</h3>
            <div className="w-10 h-10 bg-lime-400/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-lime-400" />
            </div>
          </div>
          <p className="text-4xl font-bold text-zinc-100">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.estimatedRevenue)}
          </p>
        </div>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-400 font-medium">Faturamento Realizado</h3>
            <div className="w-10 h-10 bg-emerald-400/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <p className="text-4xl font-bold text-emerald-400">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.realizedRevenue)}
          </p>
        </div>
      </div>
    </div>
  );
}
