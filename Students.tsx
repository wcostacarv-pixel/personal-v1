import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Plus, Edit2, Trash2, X, Check, Search, Video } from 'lucide-react';

interface Exercise {
  id: string;
  name: string;
  target_muscle: string;
  equipment: string;
  video_url: string;
}

const MUSCLE_GROUPS = [
  'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Pernas', 'Glúteos', 'Abdômen', 'Cardio', 'Mobilidade', 'Outros'
];

export default function Exercises() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    target_muscle: 'Peito',
    equipment: '',
    video_url: ''
  });

  useEffect(() => {
    fetchExercises();
  }, [user]);

  const fetchExercises = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('exercises_library')
        .select('*')
        .eq('professional_id', user.id)
        .order('name');
      
      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (exercise?: Exercise) => {
    if (exercise) {
      setEditingExercise(exercise);
      setFormData({
        name: exercise.name,
        target_muscle: exercise.target_muscle,
        equipment: exercise.equipment || '',
        video_url: exercise.video_url || ''
      });
    } else {
      setEditingExercise(null);
      setFormData({
        name: '',
        target_muscle: 'Peito',
        equipment: '',
        video_url: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingExercise) {
        const { error } = await supabase
          .from('exercises_library')
          .update(formData)
          .eq('id', editingExercise.id)
          .eq('professional_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('exercises_library')
          .insert([{ ...formData, professional_id: user.id }]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchExercises();
    } catch (error: any) {
      console.error('Error saving exercise:', error);
      if (error.message?.includes('column') || error.code === '42703') {
        alert(`ERRO DE SCHEMA: Coluna não encontrada no banco de dados. Verifique a tabela public.exercises_library. Detalhes: ${error.message}`);
      } else {
        alert('Erro ao salvar exercício.');
      }
    }
  };

  const deleteExercise = async (id: string) => {
    console.log("Tentando excluir exercício:", id);
    if (!user) return;
    if (!window.confirm('Tem certeza que deseja excluir este exercício?')) return;

    try {
      const { error } = await supabase
        .from('exercises_library')
        .delete()
        .eq('id', id)
        .eq('professional_id', user.id);
      
      if (error) {
        // Erro 23503: Foreign key violation (exercício em uso)
        if (error.code === '23503') {
          alert('Não é possível excluir este exercício pois ele está sendo usado em uma ou mais fichas de treino. Remova-o das fichas primeiro.');
          return;
        }
        throw error;
      }

      // Atualiza a lista local imediatamente para feedback visual rápido
      setExercises(prev => prev.filter(ex => ex.id !== id));
      alert('Exercício excluído com sucesso!');
    } catch (error: any) {
      console.error('Error deleting exercise:', error);
      alert(`Erro ao excluir exercício: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const filteredExercises = exercises.filter(ex => 
    ex.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    ex.target_muscle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-zinc-400">Carregando exercícios...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">Biblioteca de Exercícios</h1>
          <p className="text-zinc-400 mt-1">Gerencie seu catálogo de movimentos</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-lime-400 hover:bg-lime-500 text-zinc-950 font-semibold px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Exercício
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar exercícios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-950/50 text-xs uppercase font-semibold text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4">Nome do Exercício</th>
                <th className="px-6 py-4">Grupo Muscular</th>
                <th className="px-6 py-4">Equipamento</th>
                <th className="px-6 py-4">Vídeo</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredExercises.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    Nenhum exercício encontrado.
                  </td>
                </tr>
              ) : (
                filteredExercises.map((exercise) => (
                  <tr key={exercise.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-100">{exercise.name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300">
                        {exercise.target_muscle}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {exercise.equipment || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {exercise.video_url ? (
                        <a href={exercise.video_url} target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:text-lime-300 flex items-center gap-1">
                          <Video className="w-4 h-4" />
                          <span className="text-xs">Ver</span>
                        </a>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(exercise)}
                          className="p-2 text-zinc-400 hover:text-lime-400 hover:bg-lime-400/10 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteExercise(exercise.id)}
                          className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-zinc-100">
                {editingExercise ? 'Editar Exercício' : 'Novo Exercício'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Nome do Exercício</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all"
                  placeholder="Ex: Supino Reto com Barra"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Grupo Muscular</label>
                <select
                  value={formData.target_muscle}
                  onChange={(e) => setFormData({ ...formData, target_muscle: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all"
                >
                  {MUSCLE_GROUPS.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Equipamento (Opcional)</label>
                <input
                  type="text"
                  value={formData.equipment}
                  onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all"
                  placeholder="Ex: Halteres, Barra..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Link do Vídeo (Opcional)</label>
                <input
                  type="url"
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all"
                  placeholder="Ex: https://youtube.com/..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-zinc-400 hover:text-zinc-100 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-lime-400 hover:bg-lime-500 text-zinc-950 font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-colors"
                >
                  <Check className="w-5 h-5" />
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
