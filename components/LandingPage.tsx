import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock3, Shield, Users, Trophy, History } from 'lucide-react';
import { Categoria, Competicion, RecentCompetition, Temporada } from '../types';
import CompetitionFilterForm from './CompetitionFilterForm';

interface LandingPageProps {
  temporadas: Temporada[];
  categorias: Categoria[];
  competiciones: Competicion[];
  loadingCompetitions: boolean;
  selectedTemporada: string;
  selectedCategoria: string;
  selectedFase: string;
  selectedCompeticion: string;
  onTemporadaChange: (val: string) => void;
  onCategoriaChange: (val: string) => void;
  onFaseChange: (val: string) => void;
  onCompeticionChange: (val: string) => void;
  recentSearches: RecentCompetition[];
  onOpenRecent: (item: RecentCompetition) => void;
  hasActiveCompetition: boolean;
}

const LandingPage: React.FC<LandingPageProps> = ({
  temporadas,
  categorias,
  competiciones,
  loadingCompetitions,
  selectedTemporada,
  selectedCategoria,
  selectedFase,
  selectedCompeticion,
  onTemporadaChange,
  onCategoriaChange,
  onFaseChange,
  onCompeticionChange,
  recentSearches,
  onOpenRecent,
  hasActiveCompetition,
}) => {
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;

    carouselRef.current.scrollBy({
      left: direction === 'left' ? -320 : 320,
      behavior: 'smooth',
    });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-4">
      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 md:p-6">
        <CompetitionFilterForm
            temporadas={temporadas}
            categorias={categorias}
            competiciones={competiciones}
            loadingCompetitions={loadingCompetitions}
            selectedTemporada={selectedTemporada}
            selectedCategoria={selectedCategoria}
            selectedFase={selectedFase}
            selectedCompeticion={selectedCompeticion}
            onTemporadaChange={onTemporadaChange}
            onCategoriaChange={onCategoriaChange}
            onFaseChange={onFaseChange}
            onCompeticionChange={onCompeticionChange}
          />
      </section>

      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 md:p-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="text-left">
            <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clock3 size={18} className="text-fcbq-blue" />
              Últimas búsquedas
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Combinaciones guardadas recientemente.</p>
          </div>

          {recentSearches.length > 1 && (
            <div className="hidden md:flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => scrollCarousel('left')}
                className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-fcbq-blue hover:border-fcbq-blue transition-colors bg-white shadow-xs cursor-pointer"
                aria-label="Desplazar historial a la izquierda"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scrollCarousel('right')}
                className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-fcbq-blue hover:border-fcbq-blue transition-colors bg-white shadow-xs cursor-pointer"
                aria-label="Desplazar historial a la derecha"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {recentSearches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-400 font-medium">
            Tu historial de búsquedas aparecerá aquí al seleccionar competiciones.
          </div>
        ) : (
          <div
            ref={carouselRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 -mx-1 px-1 scrollbar-thin scrollbar-thumb-slate-200"
          >
            {recentSearches.map((item) => (
              <button
                key={`${item.temporadaId}-${item.categoriaId}-${item.fase || 'all'}-${item.id}`}
                onClick={() => onOpenRecent(item)}
                className="snap-start shrink-0 w-[260px] sm:w-[290px] rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 hover:to-white hover:border-fcbq-light hover:shadow-md transition-all duration-300 text-left p-4 relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-fcbq-blue/5 to-transparent rounded-bl-full transition-transform duration-300 group-hover:scale-110" />
                
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-fcbq-blue text-[9px] font-bold uppercase tracking-wider">
                    <History size={10} /> Reciente
                  </span>
                  <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                
                <h4 className="text-sm sm:text-base font-black text-slate-800 leading-tight group-hover:text-fcbq-blue transition-colors line-clamp-2 pr-4 min-h-[40px]">
                  {item.nombre}
                </h4>
                
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500 font-medium">
                  <p className="flex items-center gap-1.5 truncate"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>{item.temporadaNombre}</p>
                  <p className="flex items-center gap-1.5 truncate"><span className="w-1.5 h-1.5 rounded-full bg-fcbq-accent shrink-0"></span>{item.categoriaNombre}</p>
                  <p className="text-slate-400 italic mt-0.5 text-[11px]">{item.fase || 'Todas las fases'}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-slate-200/60 transition-all duration-300 p-5 flex flex-col justify-between gap-4 text-left group">
            <div className="space-y-1.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-fcbq-blue flex items-center justify-center mb-1">
                <Users size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Buscador de jugadores
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Acceso a la vista global de estadísticas grupales e individuales de jugadores, con ordenación avanzada y favoritos.
              </p>
            </div>

            <Link
              to="/players"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors border border-slate-200 w-full md:w-auto shadow-xs self-start cursor-pointer"
            >
              Ir a jugadores
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-slate-200/60 transition-all duration-300 p-5 flex flex-col justify-between gap-4 text-left group">
            <div className="space-y-1.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                <Shield size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Buscador de equipos
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Herramienta avanzada de estadísticas acumuladas por club, permitiendo análisis detallado por equipo titular o suplente.
              </p>
            </div>

            <Link
              to="/teams"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors border border-slate-200 w-full md:w-auto shadow-xs self-start cursor-pointer"
            >
              Ir a equipos
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;