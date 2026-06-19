import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Logo from './components/Logo';
import OnboardingWizard from './components/OnboardingWizard';
import Tour from './components/Tour';
import Dashboard from './pages/Dashboard';
import Subjects from './pages/Subjects';
import Schedule from './pages/Schedule';
import Notes from './pages/Notes';
import Pomodoro from './pages/Pomodoro';
import Tracking from './pages/Tracking';
import Performance from './pages/Performance';
import Repository from './pages/Repository';
import CalendarPage from './pages/Calendar';
import Simulator from './pages/Simulator';
import PlanBuilder from './pages/PlanBuilder';
import { useStore } from './store';

export default function App() {
  const hydrate = useStore((s) => s.hydrate);
  const hydrated = useStore((s) => s.hydrated);
  const onboardingDone = useStore((s) => s.onboardingDone);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Tour: automático la primera vez (tras el wizard) y on-demand vía evento.
  useEffect(() => {
    if (hydrated && onboardingDone && !localStorage.getItem('aulix:tourDone')) {
      setShowTour(true);
    }
  }, [hydrated, onboardingDone]);

  useEffect(() => {
    const start = () => setShowTour(true);
    window.addEventListener('aulix:tour', start);
    return () => window.removeEventListener('aulix:tour', start);
  }, []);

  const closeTour = () => {
    localStorage.setItem('aulix:tourDone', '1');
    setShowTour(false);
  };

  if (!hydrated) {
    return (
      <div className="h-screen grid place-items-center text-ink-dim bg-bg">
        <div className="text-center animate-fade-in">
          <div className="mx-auto animate-pulse">
            <Logo size={56} />
          </div>
          <p className="mt-4 display text-2xl">Aulix</p>
          <p className="text-xs text-ink-mute mt-1">Preparando tu carrera…</p>
        </div>
      </div>
    );
  }

  // Si el perfil activo no completó el onboarding, mostrar el wizard a pantalla completa.
  if (!onboardingDone) {
    return <OnboardingWizard />;
  }

  return (
    <div className="h-screen flex bg-bg text-ink">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/materias" element={<Subjects />} />
            <Route path="/horarios" element={<Schedule />} />
            <Route path="/notas" element={<Notes />} />
            <Route path="/pomodoro" element={<Pomodoro />} />
            <Route path="/seguimiento" element={<Tracking />} />
            <Route path="/rendimiento" element={<Performance />} />
            <Route path="/repositorio" element={<Repository />} />
            <Route path="/calendario" element={<CalendarPage />} />
            <Route path="/simulador" element={<Simulator />} />
            <Route path="/constructor" element={<PlanBuilder />} />
          </Routes>
        </main>
      </div>
      {showTour && <Tour onClose={closeTour} />}
    </div>
  );
}
