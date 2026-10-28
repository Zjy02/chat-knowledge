import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AuthPage } from './features/auth/AuthPage';
import { ChatPage } from './features/chat/ChatPage';
import { KnowledgePage } from './features/knowledge/KnowledgePage';
import { AppLayout } from './layouts/AppLayout';
import { ToastViewport } from './components/ToastViewport';
import { useAuthStore } from './stores/authStore';

function Splash() {
  return (
    <div className="splash">
      <div className="splash-mark">知</div>
      <div className="splash-name">知问</div>
      <div className="splash-line">
        <i />
      </div>
      <span>正在打开你的知识工作台…</span>
    </div>
  );
}

function Protected() {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();
  if (status === 'idle' || status === 'loading') return <Splash />;
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <AppLayout />;
}

export default function App() {
  const [booted, setBooted] = useState(false);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const logout = useAuthStore((state) => state.logout);
  const status = useAuthStore((state) => state.status);
  const navigate = useNavigate();

  useEffect(() => {
    void bootstrap().finally(() => setBooted(true));
  }, [bootstrap]);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
      navigate('/login', { replace: true });
    };
    window.addEventListener('zhiwen:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('zhiwen:unauthorized', handleUnauthorized);
  }, [logout, navigate]);

  // Show the splash only while the initial token check is running. A login
  // submit also sets `loading`, but that should keep the form visible.
  if (!booted && (status === 'idle' || status === 'loading')) return <Splash />;

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={
            status === 'authenticated' ? <Navigate to="/chat" replace /> : <AuthPage mode="login" />
          }
        />
        <Route
          path="/register"
          element={
            status === 'authenticated' ? (
              <Navigate to="/chat" replace />
            ) : (
              <AuthPage mode="register" />
            )
          }
        />
        <Route element={<Protected />}>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/chat/:conversationId?" element={<ChatPage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
        </Route>
        <Route
          path="*"
          element={<Navigate to={status === 'authenticated' ? '/chat' : '/login'} replace />}
        />
      </Routes>
      <ToastViewport />
    </>
  );
}
