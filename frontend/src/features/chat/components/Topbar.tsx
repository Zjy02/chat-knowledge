import { Check, Menu, MoreHorizontal, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { useUiStore } from '../../../stores/uiStore';
import { initials } from '../../../utils/format';

interface TopbarProps {
  section: '对话' | '知识库';
  title: string;
  model?: string;
}

export function Topbar({ section, title, model = 'DeepSeek · chat' }: TopbarProps) {
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const user = useAuthStore((state) => state.user);

  return (
    <header className="topbar">
      <button type="button" className="mobile-menu" onClick={toggleSidebar} aria-label="打开菜单">
        <Menu size={18} />
      </button>
      <div className="crumbs">
        <span>工作台</span>
        <span className="crumb-sep">/</span>
        <b>{section}</b>
      </div>
      <div className="top-mid">
        <span className="top-title">{title}</span>
        <span className="save-state">
          <Check size={11} /> 已同步
        </span>
      </div>
      <div className="top-actions">
        <div className="model-pill">
          <Sparkles size={11} className="spark" />
          {model}
        </div>
        <button type="button" className="icon-btn" aria-label="更多操作">
          <MoreHorizontal size={16} />
        </button>
        <div className="top-avatar">{initials(user?.name || '知')}</div>
      </div>
    </header>
  );
}
