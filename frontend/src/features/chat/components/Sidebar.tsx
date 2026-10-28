import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Avatar, Button, Dropdown, Input, type MenuProps } from 'antd';
import {
  BookOutlined,
  CloseOutlined,
  DownOutlined,
  LogoutOutlined,
  MessageOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Logo } from '../../../components/Logo';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { logout } from '../../../store/slices/authSlice';
import { setActive, startNewChat } from '../../../store/slices/conversationsSlice';
import { setSidebarOpen } from '../../../store/slices/uiSlice';
import { initials } from '../../../utils/format';
import { ConversationRow } from './ConversationRow';

export function Sidebar() {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dispatch = useAppDispatch();
  const conversations = useAppSelector((state) => state.conversations.items);
  const loading = useAppSelector((state) => state.conversations.loading);
  const activeId = useAppSelector((state) => state.conversations.activeId);
  const stats = useAppSelector((state) => state.knowledge.stats);
  const user = useAppSelector((state) => state.auth.user);
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);

  const closeOnMobile = () => dispatch(setSidebarOpen(false));
  const filtered = conversations.filter((item) =>
    item.title.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const openConversation = (id: number) => {
    dispatch(setActive(id));
    navigate(`/chat/${id}`);
    closeOnMobile();
  };

  const handleNewChat = () => {
    dispatch(startNewChat());
    navigate('/chat');
    closeOnMobile();
  };

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login', { replace: true });
  };

  const userMenu: MenuProps = {
    items: [
      { key: 'knowledge', icon: <SettingOutlined />, label: '知识库设置' },
      { type: 'divider' },
      { key: 'logout', danger: true, icon: <LogoutOutlined />, label: '退出登录' },
    ],
    onClick: ({ key }) => {
      if (key === 'knowledge') {
        navigate('/knowledge');
        closeOnMobile();
      }
      if (key === 'logout') void handleLogout();
    },
  };

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-top">
        <Logo />
        <Button
          type="text"
          className="sidebar-close"
          icon={<CloseOutlined />}
          onClick={closeOnMobile}
          aria-label="关闭菜单"
        />
      </div>

      <Button
        type="primary"
        block
        className="new-chat"
        icon={<PlusOutlined />}
        onClick={handleNewChat}
      >
        开启新对话
      </Button>

      <nav className="side-nav">
        <NavLink
          to="/chat"
          className={({ isActive }) => (isActive ? 'active' : '')}
          onClick={closeOnMobile}
        >
          <MessageOutlined /> 对话
        </NavLink>
        <NavLink
          to="/knowledge"
          className={({ isActive }) => (isActive ? 'active' : '')}
          onClick={closeOnMobile}
        >
          <BookOutlined /> 知识库
          {stats.document_count > 0 && <span className="pill">{stats.document_count}</span>}
        </NavLink>
      </nav>

      <div className="side-section">
        <span className="side-label">最近对话</span>
        <Button
          type="text"
          size="small"
          icon={<SearchOutlined />}
          onClick={() => setSearchOpen((value) => !value)}
          aria-label="搜索会话"
        />
      </div>
      {searchOpen && (
        <div className="sidebar-search">
          <Input
            autoFocus
            allowClear
            size="small"
            prefix={<SearchOutlined />}
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
            <MessageOutlined />
            <span>{search ? '没有匹配的会话' : '还没有对话'}</span>
            <Button type="link" size="small" onClick={handleNewChat}>
              开始提问
            </Button>
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
        <div
          className="kb-mini"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/knowledge')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') navigate('/knowledge');
          }}
        >
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
        <Dropdown menu={userMenu} trigger={['click']} placement="topRight">
          <button type="button" className="user-row">
            <Avatar size={30} className="avatar">
              {initials(user?.name || '知')}
            </Avatar>
            <span className="user-meta">
              <span className="user-name">{user?.name || '未登录'}</span>
              <span className="user-plan">个人版 · 本地演示</span>
            </span>
            <DownOutlined className="more" />
          </button>
        </Dropdown>
      </div>
    </aside>
  );
}
