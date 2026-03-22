import React from 'react';
import { Play, X, CheckCircle2 } from 'lucide-react';
import { useTraining } from '../lib/TrainingContext';

export function FloatingTrainingBadge() {
  const { 
    isTrainingActive, 
    isModalVisible, 
    activePlan, 
    trainingDuration, 
    formatDuration,
    showModal,
    trainingExercises,
    completedExercises,
    toggleExercise,
    finishTraining,
    cancelTraining,
    hideModal
  } = useTraining();

  if (!isTrainingActive) return null;

  return (
    <>
      {/* Floating Badge */}
      {!isModalVisible && (
        <div className="fixed bottom-6 right-6 z-40 bg-zinc-900 border border-emerald-500/30 shadow-2xl shadow-emerald-500/10 rounded-2xl p-4 flex items-center gap-4 animate-in slide-in-from-bottom-5">
          <div className="flex flex-col">
            <span className="text-xs text-zinc-400 font-medium">{activePlan?.name}</span>
            <span className="text-xl font-mono font-bold text-emerald-400">
              {formatDuration(trainingDuration)}
            </span>
          </div>
          <button
            onClick={showModal}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Abrir Treino
          </button>
        </div>
      )}

      {/* Modal Sessão de Treino */}
      {isModalVisible && activePlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800 shrink-0 bg-zinc-950">
              <div>
                <h2 className="text-xl font-bold text-zinc-100">Treino em Andamento</h2>
                <p className="text-sm text-zinc-400 mt-1">{activePlan.name}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-2xl font-mono font-bold text-emerald-400 bg-emerald-400/10 px-4 py-2 rounded-xl border border-emerald-400/20">
                  {formatDuration(trainingDuration)}
                </div>
                <button
                  onClick={hideModal}
                  className="text-zinc-400 hover:text-zinc-100 transition-colors"
                  title="Ocultar (O cronômetro continuará rodando)"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="space-y-3">
                {trainingExercises.length === 0 ? (
                  <p className="text-center text-zinc-500 py-4">Nenhum exercício encontrado nesta ficha.</p>
                ) : (
                  trainingExercises.map((ex, idx) => {
                    const isCompleted = completedExercises.has(ex.id!);
                    return (
                      <div 
                        key={ex.id || idx} 
                        className={`bg-zinc-950 border ${isCompleted ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-zinc-800'} rounded-xl p-4 flex items-center gap-4 transition-colors cursor-pointer`}
                        onClick={() => toggleExercise(ex.id!)}
                      >
                        <div className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-colors ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-zinc-950' : 'border-zinc-600 bg-zinc-900'}`}>
                          {isCompleted && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h3 className={`font-bold ${isCompleted ? 'text-emerald-400' : 'text-zinc-100'}`}>{ex.exercise?.name || 'Exercício Desconhecido'}</h3>
                            <p className="text-sm text-zinc-400">{ex.exercise?.target_muscle || '-'}</p>
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm">
                            <span className="bg-zinc-800 px-3 py-1.5 rounded-lg text-white border border-zinc-600 font-bold shadow-sm">
                              <span className="text-zinc-300 font-medium mr-1">Séries:</span> {ex.sets}
                            </span>
                            <span className="bg-zinc-800 px-3 py-1.5 rounded-lg text-white border border-zinc-600 font-bold shadow-sm">
                              <span className="text-zinc-300 font-medium mr-1">Reps:</span> {ex.reps}
                            </span>
                            {ex.weight && (
                              <span className="bg-zinc-800 px-3 py-1.5 rounded-lg text-white border border-zinc-600 font-bold shadow-sm">
                                <span className="text-zinc-300 font-medium mr-1">Carga:</span> {ex.weight}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-zinc-800 shrink-0 bg-zinc-900/50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    if (window.confirm('Deseja cancelar esta sessão? O progresso não será salvo.')) {
                      cancelTraining();
                    }
                  }}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  Cancelar Treino
                </button>
                <div className="text-sm text-zinc-400">
                  {completedExercises.size} de {trainingExercises.length} exercícios concluídos
                </div>
              </div>
              <button
                onClick={finishTraining}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Finalizar Treino
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
