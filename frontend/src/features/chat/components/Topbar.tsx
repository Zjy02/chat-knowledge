import { Avatar, Button, Tag, Tooltip } from 'antd';
import { CheckOutlined, MenuOutlined, MoreOutlined, StarOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { toggleSidebar } from '../../../store/slices/uiSlice';
import { initials } from '../../../utils/format';

interface TopbarProps {
  section: '对话' | '知识库';
  title: string;
  model?: string;
}

export function Topbar({ section, title, model = 'DeepSeek · chat' }: TopbarProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  return (
    <header className="topbar">
      <Button
        className="mobile-menu"
        type="text"
        icon={<MenuOutlined />}
        aria-label="打开菜单"
        onClick={() => dispatch(toggleSidebar())}
      />
      <div className="crumbs">
        <span>工作台</span>
        <span className="crumb-sep">/</span>
        <b>{section}</b>
      </div>
      <div className="top-mid">
        <span className="top-title">{title}</span>
        <span className="save-state">
          <CheckOutlined /> 已同步
        </span>
      </div>
      <div className="top-actions">
        <Tag className="model-pill" icon={<StarOutlined />}>
          {model}
        </Tag>
        <Tooltip title="更多操作">
          <Button type="text" shape="circle" icon={<MoreOutlined />} aria-label="更多操作" />
        </Tooltip>
        <Avatar className="top-avatar" size={30}>
          {initials(user?.name || '知')}
        </Avatar>
      </div>
    </header>
  );
}
