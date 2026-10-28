import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../features/chat/components/Sidebar';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadConversations } from '../store/slices/conversationsSlice';
import { refreshStats } from '../store/slices/knowledgeSlice';
import { setSidebarOpen } from '../store/slices/uiSlice';

export function AppLayout() {
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const location = useLocation();

  useEffect(() => {
    void dispatch(loadConversations());
    void dispatch(refreshStats());
  }, [dispatch]);

  useEffect(() => {
    dispatch(setSidebarOpen(false));
  }, [location.pathname, dispatch]);

  return (
    <div className="app">
      <Sidebar />
      {sidebarOpen && (
        <button
          type="button"
          className="scrim"
          aria-label="关闭菜单"
          onClick={() => dispatch(setSidebarOpen(false))}
        />
      )}
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
