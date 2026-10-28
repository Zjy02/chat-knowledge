import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ChevronDown,
  LogOut,
  MessageSquare,
  Plus,
  Search,
  Settings,
  UserRound,
  X,
} from 'lucide-react';
import { Logo } from '../../../components/Logo';
import { useAuthStore } from '../../../stores/authStore';
import { useConversationStore } from '../../../stores/conversationStore';
import { useKnowledgeStore } from '../../../stores/knowledgeStore';
import { useUiStore } from '../../../stores/uiStore';
import { initials } from '../../../utils/format';
import { ConversationRow } from './ConversationRow';

export function Sidebar() {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const conversations = useConversationStore((state) => state.conversations);
  const loading = useConversationStore((state) => state.loading);
  const activeId = useConversationStore((state) => state.activeId);
  const setActive = useConversationStore((state) => state.setActive);
  const startNewChat = useConversationStore((state) => state.startNewChat);
  const stats = useKnowledgeStore((state) => state.stats);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);

  const closeOnMobile = () => setSidebarOpen(false);
  const filtered = conversations.filter((item) =>
    item.title.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const openConversation = (id: number) => {
    setActive(id);
    navigate(`/chat/${id}`);
    closeOnMobile();
  };

  const handleNewChat = () => {
    startNewChat();
    navigate('/chat');
    closeOnMobile();
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-top">
        <Logo />
        <button
          type="button"
          className="sidebar-close icon-btn"
          onClick={closeOnMobile}
          aria-label="关闭菜单"
        >
          <X size={17} />
        </button>
      </div>

      <button type="button" className="new-chat" onClick={handleNewChat}>
        <Plus size={15} /> 开启新对话
      </button>

      <nav className="side-nav">
        <NavLink
          to="/chat"
          className={({ isActive }) => (isActive ? 'active' : '')}
          onClick={closeOnMobile}
        >
          <MessageSquare size={15} /> 对话
        </NavLink>
        <NavLink
          to="/knowledge"
          className={({ isActive }) => (isActive ? 'active' : '')}
          onClick={closeOnMobile}
        >
          <BookOpen size={15} /> 知识库
          {stats.document_count > 0 && <span className="pill">{stats.document_count}</span>}
        </NavLink>
      </nav>

      <div className="side-section">
        <span className="side-label">最近对话</span>
        <button
          type="button"
          className="icon-btn tiny"
          onClick={() => setSearchOpen((value) => !value)}
          aria-label="搜索会话"
        >
          <Search size={13} />
        </button>
      </div>
      {searchOpen && (
        <div className="sidebar-search">
          <Search size={12} />
          <input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索会话"
          />
        </div>
      )}
      <div className="conv-list">
        {loading && conversations.length === 0 && (
          <div className="conv-skeletons">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="conv-skeleton" />
            ))}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="conv-empty">
            <MessageSquare size={18} />
            <span>{search ? '没有匹配的会话' : '还没有对话'}</span>
            <button type="button" onClick={handleNewChat}>
              开始提问
            </button>
          </div>
        )}
        {filtered.map((conversation) => (
          <ConversationRow
            key={conversation.id}
            conversation={conversation}
            active={conversation.id === activeId}
            onOpen={() => openConversation(conversation.id)}
          />
        ))}
      </div>

      <div className="side-footer">
        <div className="kb-mini" onClick={() => navigate('/knowledge')}>
          <div className="kb-mini-head">
            <b>
              <i /> 知识库{stats.ready_count > 0 ? '已就绪' : '待添加'}
            </b>
            <span>{stats.ready_count > 0 ? `${stats.ready_count} 篇` : '—'}</span>
          </div>
          <div className="kb-mini-num">
            {stats.chunk_count} <span>个知识片段</span>
          </div>
          <div className="kb-bar">
            <i style={{ width: `${Math.min(100, stats.ready_count * 12 + 20)}%` }} />
          </div>
        </div>
        <div className="user-row-wrap">
          <button
            type="button"
            className="user-row"
            onClick={() => setUserMenuOpen((value) => !value)}
            aria-expanded={userMenuOpen}
          >
            <div className="avatar">{initials(user?.name || '知')}</div>
            <div className="user-meta">
              <div className="user-name">{user?.name || '未登录'}</div>
              <div className="user-plan">个人版 · 本地演示</div>
            </div>
            <ChevronDown size={13} className="more" />
          </button>
          {userMenuOpen && (
            <div className="user-menu">
              <div className="user-menu-head">
                <UserRound size={14} />
                <div>
                  <b>{user?.name}</b>
                  <span>{user?.email}</span>
                </div>
              </div>
              <button type="button" onClick={() => navigate('/knowledge')}>
                <Settings size={13} /> 知识库设置
              </button>
              <button type="button" className="danger" onClick={handleLogout}>
                <LogOut size={13} /> 退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
