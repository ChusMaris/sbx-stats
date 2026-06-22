
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { fetchTemporadas, fetchCategorias, fetchCompeticiones, fetchCompeticionDetails } from './services/dataService';
import { Temporada, Categoria, Competicion, RecentCompetition } from './types';
import CompetitionFilters from './components/CompetitionFilters';
import StatsView from './components/StatsView';
import ScoutingView from './components/ScoutingView';
import LandingPage from './components/LandingPage';
import PlayersPage from './components/PlayersPage';
import TeamsPage from './components/TeamsPage';
import { Loader2, Trophy, AlertCircle, BarChart3, CalendarDays, Shield, Unlock, Users, Home } from 'lucide-react';
import { getActiveCompetition, getRecentCompetitions, setActiveCompetition, upsertRecentCompetition } from './utils/competitionStorage';

type ViewDataState = {
  matches: any[];
  realMatches: any[];
  equipos: any[];
  competicion: Competicion | null;
} | null;

const getInitialSelection = () => getActiveCompetition();

const AppContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialSelection = useMemo(() => getInitialSelection(), []);

  // --- Admin / Secret Mode Logic ---
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('brafa_admin_mode') === 'true';
  });
  
  const clickCounter = useRef(0);
  const clickTimer = useRef<NodeJS.Timeout | null>(null);

  const handleSecretClick = () => {
    clickCounter.current += 1;

    // Clear existing timer to reset the window of opportunity
    if (clickTimer.current) clearTimeout(clickTimer.current);

    // Set a timeout to reset counter if user stops clicking
    clickTimer.current = setTimeout(() => {
        clickCounter.current = 0;
    }, 1000); // 1 second to keep clicking

    // Trigger at 5 clicks
    if (clickCounter.current === 5) {
        const newState = !isAdmin;
        setIsAdmin(newState);
        localStorage.setItem('brafa_admin_mode', String(newState));
        
        // Visual feedback could be a toast, for now alert is simple and effective for this requirement
        alert(newState ? "🔓 MODO GESTIÓN ACTIVADO" : "🔒 MODO GESTIÓN DESACTIVADO");
        clickCounter.current = 0;
    }
  };

  // --- Global State for Selection ---
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [competiciones, setCompeticiones] = useState<Competicion[]>([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentCompetition[]>(() => getRecentCompetitions());

  const [selectedTemporada, setSelectedTemporada] = useState<string>(() => initialSelection?.temporadaId || '');
  const [selectedCategoria, setSelectedCategoria] = useState<string>(() => initialSelection?.categoriaId || '');
  const [selectedFase, setSelectedFase] = useState<string>(() => initialSelection?.fase || '');
  const [selectedCompeticion, setSelectedCompeticion] = useState<string>(() => initialSelection?.id || '');
  
  // --- UI State ---
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const isScrolledRef = useRef(false);

  // --- Global Data State ---
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewData, setViewData] = useState<ViewDataState>(null);

  const isLandingRoute = location.pathname === '/';
  const isStatsRoute = location.pathname === '/stats';
  const isMatchCenterRoute = location.pathname === '/match-center';
  const isPlayersRoute = location.pathname === '/players';
  const isTeamsRoute = location.pathname === '/teams';
  const shouldShowStickyShell = isStatsRoute || isMatchCenterRoute;

  // --- Initial Load ---
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const temps = await fetchTemporadas();
        const cats = await fetchCategorias();
        setTemporadas(temps);
        setCategorias(cats);
      } catch (error) {
        console.error("Error loading filters", error);
        setErrorMsg("Error cargando los filtros iniciales. Por favor recarga la página.");
      }
    };
    loadFilters();
  }, []);

  // --- Scroll Listener ---
  useEffect(() => {
    let rafId: number | null = null;

    // Hysteresis avoids oscillation/flicker when sticky header height changes near the threshold.
    const MOBILE_ENTER_THRESHOLD = 92;
    const MOBILE_LEAVE_THRESHOLD = 36;
    const DESKTOP_ENTER_THRESHOLD = 72;
    const DESKTOP_LEAVE_THRESHOLD = 28;

    const updateScrollState = () => {
      const y = window.scrollY || 0;
      const isMobile = window.innerWidth < 768;

      const enterThreshold = isMobile ? MOBILE_ENTER_THRESHOLD : DESKTOP_ENTER_THRESHOLD;
      const leaveThreshold = isMobile ? MOBILE_LEAVE_THRESHOLD : DESKTOP_LEAVE_THRESHOLD;

      const next = isScrolledRef.current
        ? y > leaveThreshold
        : y > enterThreshold;

      if (next !== isScrolledRef.current) {
        isScrolledRef.current = next;
        setIsScrolled(next);
      }

      rafId = null;
    };

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(updateScrollState);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  // --- Auto-Collapse Filters when Competition Selected ---
  useEffect(() => {
    if (selectedCompeticion) {
        setIsFilterExpanded(false);
    } else {
        setIsFilterExpanded(true);
    }
  }, [selectedCompeticion]);

  // --- Update Competitions when Temp/Cat changes ---
  useEffect(() => {
    if (selectedTemporada && selectedCategoria) {
      const loadComps = async () => {
        setLoadingCompetitions(true);
        setErrorMsg(null);
        try {
          const comps = await fetchCompeticiones(selectedTemporada, selectedCategoria);
          setCompeticiones(comps);

          if (selectedCompeticion && !comps.some((comp) => String(comp.id) === selectedCompeticion)) {
            setSelectedCompeticion('');
            setViewData(null);
          }
        } catch (error) {
          console.error("Error loading competitions", error);
          setErrorMsg("Error cargando las competiciones.");
        } finally {
          setLoadingCompetitions(false);
        }
      };
      loadComps();
    } else {
      setCompeticiones([]);
    }
  }, [selectedTemporada, selectedCategoria]);

  // --- Fetch Data when Competition Changes ---
  const loadCompetitionData = async () => {
        if (!selectedCompeticion) {
            setViewData(null);
            return;
        }
        
        setIsLoading(true);
        setErrorMsg(null);
        
        try {
          const details = await fetchCompeticionDetails(selectedCompeticion);
          const comp = details.competicion || competiciones.find(c => c.id.toString() === selectedCompeticion) || null;
          
          const categoryInfo = categorias.find(c => c.id.toString() === selectedCategoria);
          const compWithCategory = comp ? { 
              ...comp, 
              categorias: categoryInfo 
          } : null;

          setViewData({
            matches: details.partidos,
            realMatches: details.realMatches,
            equipos: details.equipos,
            competicion: compWithCategory
          });
          
          if (details.equipos.length === 0) {
            setErrorMsg("No se han encontrado equipos ni partidos para esta competición.");
          }

        } catch (error: any) {
          console.error("Error fetching competition details", error);
          setErrorMsg(`Error al cargar los datos: ${error.message || 'Inténtalo de nuevo.'}`);
        } finally {
          setIsLoading(false);
        }
    };

  useEffect(() => {
    if (selectedCompeticion) {
      loadCompetitionData();
    }
  }, [selectedCompeticion, selectedCategoria, categorias]);

  useEffect(() => {
    if (!selectedCompeticion) return;
    if (!shouldShowStickyShell) return;

    const loadedCompetitionId = viewData?.competicion?.id ? String(viewData.competicion.id) : '';

    if (!viewData || loadedCompetitionId !== String(selectedCompeticion)) {
      loadCompetitionData();
    }
  }, [shouldShowStickyShell, selectedCompeticion, viewData]);

  useEffect(() => {
    if ((isStatsRoute || isMatchCenterRoute) && !selectedCompeticion) {
      navigate('/', { replace: true });
    }
  }, [isMatchCenterRoute, isStatsRoute, navigate, selectedCompeticion]);

  const buildRecentCompetition = (competitionId = selectedCompeticion): RecentCompetition | null => {
    if (!competitionId || !selectedTemporada || !selectedCategoria) return null;

    const competencia = competiciones.find((item) => String(item.id) === String(competitionId));
    const temporada = temporadas.find((item) => String(item.id) === selectedTemporada);
    const categoria = categorias.find((item) => String(item.id) === selectedCategoria);

    if (!competencia || !temporada || !categoria) return null;

    return {
      id: String(competencia.id),
      nombre: competencia.nombre,
      temporadaId: String(temporada.id),
      categoriaId: String(categoria.id),
      temporadaNombre: temporada.nombre,
      categoriaNombre: categoria.nombre,
      fase: selectedFase || undefined,
      timestamp: Date.now(),
    };
  };

  const syncStoredCompetition = (item: RecentCompetition, pushToHistory: boolean) => {
    setActiveCompetition(item);

    if (pushToHistory) {
      setRecentSearches(upsertRecentCompetition(item));
      return;
    }

    setRecentSearches(getRecentCompetitions());
  };

  useEffect(() => {
    const item = buildRecentCompetition();
    if (item) {
      setActiveCompetition(item);
    }
  }, [selectedCompeticion, selectedTemporada, selectedCategoria, selectedFase, competiciones, temporadas, categorias]);

  const handleTemporadaChange = (value: string) => {
    if (value === selectedTemporada) return;
    setSelectedTemporada(value);
    setSelectedCategoria('');
    setSelectedFase('');
    setSelectedCompeticion('');
    setCompeticiones([]);
    setViewData(null);
    setIsFilterExpanded(true);
  };

  const handleCategoriaChange = (value: string) => {
    if (value === selectedCategoria) return;
    setSelectedCategoria(value);
    setSelectedFase('');
    setSelectedCompeticion('');
    setViewData(null);
    setIsFilterExpanded(true);
  };

  const handleFaseChange = (value: string) => {
    if (value === selectedFase) return;
    setSelectedFase(value);
    setSelectedCompeticion('');
    setViewData(null);
    setIsFilterExpanded(true);
  };

  const handleCompeticionChange = (value: string) => {
    setSelectedCompeticion(value);

    if (!value) {
      setViewData(null);
      return;
    }

    if (isLandingRoute) {
      const competencia = competiciones.find((item) => String(item.id) === String(value));
      const temporada = temporadas.find((item) => String(item.id) === selectedTemporada);
      const categoria = categorias.find((item) => String(item.id) === selectedCategoria);

      if (competencia && temporada && categoria) {
        const item: RecentCompetition = {
          id: String(competencia.id),
          nombre: competencia.nombre,
          temporadaId: String(temporada.id),
          categoriaId: String(categoria.id),
          temporadaNombre: temporada.nombre,
          categoriaNombre: categoria.nombre,
          fase: selectedFase || undefined,
          timestamp: Date.now(),
        };

        syncStoredCompetition(item, true);
        navigate('/stats');
      }

      return;
    }

    if (isStatsRoute || isMatchCenterRoute) {
      const item = buildRecentCompetition(value);
      if (item) {
        syncStoredCompetition(item, true);
      }
    }
  };

  const handleOpenRecentSearch = (item: RecentCompetition) => {
    setSelectedTemporada(item.temporadaId);
    setSelectedCategoria(item.categoriaId);
    setSelectedFase(item.fase || '');
    setSelectedCompeticion(item.id);
    setViewData(null);
    setIsFilterExpanded(false);
    syncStoredCompetition({ ...item, timestamp: Date.now() }, true);
    navigate('/stats');
  };

  const activeCompetitionName = viewData?.competicion?.nombre || competiciones.find(c => c.id.toString() === selectedCompeticion)?.nombre;

  const renderTopHeader = (sticky: boolean) => (
    <header className={`bg-gradient-to-r from-fcbq-dark to-fcbq-blue text-white shadow-md transition-all duration-300 ${sticky ? (isScrolled ? 'py-1.5' : 'py-3 md:py-4') : 'py-3.5'}`}>
      <div className="container mx-auto px-2 md:px-4">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-2 md:gap-3 overflow-hidden cursor-pointer select-none active:scale-95 transition-transform"
            onClick={handleSecretClick}
            title={isAdmin ? "Modo Gestión Activo" : "Haz clic para Gestión"}
          >
            <div
              className={`bg-white rounded-full flex items-center justify-center text-fcbq-blue font-black border-2 transition-all duration-300 overflow-hidden ${isAdmin ? 'border-green-400 shadow-[0_0_12px_rgba(74,222,128,0.6)] animate-pulse' : 'border-fcbq-accent'} ${sticky ? (isScrolled ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-lg') : 'w-10 h-10 text-lg'}`}
            >
              <span>B</span>
            </div>

            <div className="flex flex-col justify-center">
              <h1 className="text-base md:text-2xl font-black tracking-tight flex items-center gap-1.5 md:gap-2 leading-none uppercase">
                Brafa Stats
                {isAdmin && <span className="flex h-2 w-2 rounded-full bg-green-400 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span></span>}
              </h1>
              <span className="text-[8px] md:text-[10px] text-blue-200 uppercase tracking-widest leading-none mt-1">FCBQ Analytics</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5">
            <NavLink
              to="/"
              className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-200 border border-transparent ${isActive ? 'bg-white text-fcbq-blue shadow-sm font-black' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}
            >
              <Home size={14} />
              <span>Inicio</span>
            </NavLink>

            <NavLink
              to="/stats"
              onClick={(e) => {
                if (!selectedCompeticion) {
                  e.preventDefault();
                  alert("Por favor, selecciona primero una competición.");
                }
              }}
              className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-200 border border-transparent ${!selectedCompeticion ? 'opacity-40 cursor-not-allowed' : isActive ? 'bg-white text-fcbq-blue shadow-sm font-black' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}
            >
              <BarChart3 size={14} />
              <span>Estadísticas</span>
            </NavLink>

            <NavLink
              to="/match-center"
              onClick={(e) => {
                if (!selectedCompeticion) {
                  e.preventDefault();
                  alert("Por favor, selecciona primero una competición.");
                }
              }}
              className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-200 border border-transparent ${!selectedCompeticion ? 'opacity-40 cursor-not-allowed' : isActive ? 'bg-white text-fcbq-blue shadow-sm font-black' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}
            >
              <CalendarDays size={14} />
              <span>Match Center</span>
            </NavLink>

            <NavLink
              to="/players"
              className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-200 border border-transparent ${isActive ? 'bg-white text-fcbq-blue shadow-sm font-black' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}
            >
              <Users size={14} />
              <span>Jugadores</span>
            </NavLink>

            <NavLink
              to="/teams"
              className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-200 border border-transparent ${isActive ? 'bg-white text-fcbq-blue shadow-sm font-black' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}
            >
              <Shield size={14} />
              <span>Equipos</span>
            </NavLink>
          </nav>
        </div>
      </div>
    </header>
  );

  const renderBottomNav = () => (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 py-1.5 flex justify-around items-center shadow-[0_-8px_30px_rgba(0,0,0,0.06)] pb-safe">
      <NavLink
        to="/"
        className={({ isActive }) => `flex flex-col items-center gap-0.5 py-0.5 text-center flex-1 transition-all ${isActive ? 'text-fcbq-blue font-black' : 'text-slate-400 font-bold'}`}
      >
        <Home size={18} className="stroke-[2.5]" />
        <span className="text-[9px] tracking-tight uppercase">Inicio</span>
      </NavLink>

      <button
        onClick={() => {
          if (!selectedCompeticion) {
            alert("Selecciona primero una competición en la página de inicio.");
          } else {
            navigate('/stats');
          }
        }}
        className={`flex flex-col items-center gap-0.5 py-0.5 text-center flex-1 transition-all ${!selectedCompeticion ? 'opacity-30 cursor-not-allowed text-slate-400 font-bold' : location.pathname === '/stats' ? 'text-fcbq-blue font-black' : 'text-slate-400 font-bold'}`}
      >
        <BarChart3 size={18} className="stroke-[2.5]" />
        <span className="text-[9px] tracking-tight uppercase">Stats</span>
      </button>

      <button
        onClick={() => {
          if (!selectedCompeticion) {
            alert("Selecciona primero una competición en la página de inicio.");
          } else {
            navigate('/match-center');
          }
        }}
        className={`flex flex-col items-center gap-0.5 py-0.5 text-center flex-1 transition-all ${!selectedCompeticion ? 'opacity-30 cursor-not-allowed text-slate-400 font-bold' : location.pathname === '/match-center' ? 'text-fcbq-blue font-black' : 'text-slate-400 font-bold'}`}
      >
        <CalendarDays size={18} className="stroke-[2.5]" />
        <span className="text-[9px] tracking-tight uppercase">Partidos</span>
      </button>

      <NavLink
        to="/players"
        className={({ isActive }) => `flex flex-col items-center gap-0.5 py-0.5 text-center flex-1 transition-all ${isActive ? 'text-fcbq-blue font-black' : 'text-slate-400 font-bold'}`}
      >
        <Users size={18} className="stroke-[2.5]" />
        <span className="text-[9px] tracking-tight uppercase">Jugadores</span>
      </NavLink>

      <NavLink
        to="/teams"
        className={({ isActive }) => `flex flex-col items-center gap-0.5 py-0.5 text-center flex-1 transition-all ${isActive ? 'text-fcbq-blue font-black' : 'text-slate-400 font-bold'}`}
      >
        <Shield size={18} className="stroke-[2.5]" />
        <span className="text-[9px] tracking-tight uppercase">Equipos</span>
      </NavLink>
    </nav>
  );

  const renderDataRoute = (route: 'stats' | 'match-center') => {
    if (isLoading && !viewData) {
      return (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200 flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 size={56} className="text-fcbq-blue animate-spin mb-4" />
          <h3 className="text-2xl font-bold text-gray-800">Cargando datos...</h3>
          <p className="text-gray-500 mt-2 text-lg">Obteniendo información de la competición.</p>
        </div>
      );
    }

    if (!viewData && !isLoading && !errorMsg) {
      return (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200 mt-8">
          <div className="inline-block p-4 bg-blue-50 rounded-full mb-4">
            <Trophy size={56} className="text-fcbq-blue" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">Selecciona una competición</h3>
          <p className="text-gray-500 mt-2 text-lg">Usa los filtros superiores para cargar los datos.</p>
        </div>
      );
    }

    if (!viewData) {
      return null;
    }

    return (
      <div className={`animate-fade-in relative transition-opacity duration-200 ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}>
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-start justify-center pt-20">
            <div className="bg-white/80 p-4 rounded-full shadow-lg border border-blue-100">
              <Loader2 size={32} className="text-fcbq-blue animate-spin" />
            </div>
          </div>
        )}

        {route === 'stats' ? (
          <StatsView viewData={viewData} selectedCompeticionId={selectedCompeticion} />
        ) : (
          <ScoutingView
            viewData={viewData}
            selectedCompeticionId={selectedCompeticion}
            onMatchAdded={loadCompetitionData}
            isAdmin={isAdmin}
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-slate-50">
      {shouldShowStickyShell ? (
        <div className="sticky top-0 z-40 bg-white shadow-md flex flex-col transition-all duration-300">
          {renderTopHeader(true)}
          <CompetitionFilters
            temporadas={temporadas}
            categorias={categorias}
            competiciones={competiciones}
            loadingCompetitions={loadingCompetitions}
            selectedTemporada={selectedTemporada}
            selectedCategoria={selectedCategoria}
            selectedFase={selectedFase}
            selectedCompeticion={selectedCompeticion}
            onTemporadaChange={handleTemporadaChange}
            onCategoriaChange={handleCategoriaChange}
            onFaseChange={handleFaseChange}
            onCompeticionChange={handleCompeticionChange}
            isScrolled={isScrolled}
            isExpanded={isFilterExpanded}
            setIsExpanded={setIsFilterExpanded}
          />
        </div>
      ) : (
        renderTopHeader(false)
      )}

      <main className={`flex-grow container mx-auto px-2 md:px-4 ${isLandingRoute ? 'py-6 md:py-8' : 'py-8'} pb-24 md:pb-8 relative z-10`}>
        {errorMsg && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r shadow-sm flex items-start gap-3">
             <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={24} />
             <div>
               <p className="font-bold text-red-800 text-base">Atención</p>
               <p className="text-sm text-red-700">{errorMsg}</p>
             </div>
          </div>
        )}

        <Routes>
          <Route
            path="/"
            element={
              <LandingPage
                temporadas={temporadas}
                categorias={categorias}
                competiciones={competiciones}
                loadingCompetitions={loadingCompetitions}
                selectedTemporada={selectedTemporada}
                selectedCategoria={selectedCategoria}
                selectedFase={selectedFase}
                selectedCompeticion={selectedCompeticion}
                onTemporadaChange={handleTemporadaChange}
                onCategoriaChange={handleCategoriaChange}
                onFaseChange={handleFaseChange}
                onCompeticionChange={handleCompeticionChange}
                recentSearches={recentSearches}
                onOpenRecent={handleOpenRecentSearch}
                hasActiveCompetition={Boolean(selectedCompeticion)}
              />
            }
          />
          <Route path="/stats" element={renderDataRoute('stats')} />
          <Route path="/match-center" element={renderDataRoute('match-center')} />
          <Route path="/players" element={<PlayersPage activeCompetitionName={activeCompetitionName} />} />
          <Route path="/teams" element={<TeamsPage />} />
        </Routes>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-10 text-center text-base pb-24 md:pb-10">
        <p>&copy; {new Date().getFullYear()} Brafa Stats. Datos no oficiales para uso analítico.</p>
        <p className="text-[10px] text-slate-700 mt-2">
            {isAdmin 
                ? "Modo Gestión Activo. Haz clic 5 veces en el logo para salir." 
                : "Haz clic 5 veces en el logo para gestión."}
        </p>
      </footer>
      {renderBottomNav()}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
        <AppContent />
    </Router>
  );
};

export default App;
