import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../features/chat/components/Sidebar';
import { useUiStore } from '../stores/uiStore';

export function AppLayout() {
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, setSidebarOpen]);

  return (
    <div className="app">
      <Sidebar />
      {sidebarOpen && (
        <button
          type="button"
          className="scrim"
          aria-label="关闭菜单"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
