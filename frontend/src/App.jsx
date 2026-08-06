import { AnimatePresence, motion } from 'framer-motion';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import CitizenDashboard from './pages/CitizenDashboard';
import AuthorityDashboard from './pages/AuthorityDashboard';
import MapPage from './pages/MapPage';

function ProtectedRoute({ children, requiredRole }) {
  const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('civic_user') || 'null') : null;
  const token = typeof window !== 'undefined' ? localStorage.getItem('civic_token') : null;

  if (!token || !storedUser) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && storedUser.role !== requiredRole) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/citizen" element={<ProtectedRoute requiredRole="citizen"><CitizenDashboard /></ProtectedRoute>} />
          <Route path="/authority" element={<ProtectedRoute requiredRole="authority"><AuthorityDashboard /></ProtectedRoute>} />
          <Route path="/map" element={<MapPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return <AppRoutes />;
}
