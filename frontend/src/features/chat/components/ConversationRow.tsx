import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dropdown, type MenuProps } from 'antd';
import { DeleteOutlined, EditOutlined, MessageOutlined, MoreOutlined } from '@ant-design/icons';
import { formatRelativeTime } from '../../../utils/format';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { RenameDialog } from '../../../components/RenameDialog';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  removeConversation,
  renameConversation,
  startNewChat,
} from '../../../store/slices/conversationsSlice';
import type { ConversationSummary } from '../../../types';

interface ConversationRowProps {
  conversation: ConversationSummary;
  active: boolean;
  onOpen: (conversation: ConversationSummary) => void;
}

export function ConversationRow({ conversation, active, onOpen }: ConversationRowProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const activeId = useAppSelector((state) => state.conversations.activeId);

  const menu: MenuProps = {
    items: [
      { key: 'rename', icon: <EditOutlined />, label: '重命名' },
      { type: 'divider' },
      { key: 'delete', danger: true, icon: <DeleteOutlined />, label: '删除' },
    ],
    onClick: ({ key }) => {
      if (key === 'rename') setRenameOpen(true);
      if (key === 'delete') setDeleteOpen(true);
    },
  };

  const deleteConversation = async () => {
    setDeleting(true);
    try {
      await dispatch(removeConversation(conversation.id)).unwrap();
      setDeleteOpen(false);
      if (activeId === conversation.id) {
        dispatch(startNewChat());
        navigate('/chat', { replace: true });
      }
    } catch {
      // The thunk already surfaced a message.
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className={`conv ${active ? 'active' : ''}`}>
        <button type="button" className="conv-open" onClick={() => onOpen(conversation)}>
          <MessageOutlined className="conv-icon" />
          <span className="conv-body">
            <span className="conv-title">{conversation.title}</span>
            <span className="conv-time">
              {formatRelativeTime(conversation.last_message_at)}
              <span className="dot" />
              {conversation.message_count} 条消息
            </span>
          </span>
        </button>
        <Dropdown menu={menu} trigger={['click']} placement="bottomRight">
          <Button
            type="text"
            size="small"
            className="conv-more"
            icon={<MoreOutlined />}
            aria-label="会话操作"
            onClick={(event) => event.stopPropagation()}
          />
        </Dropdown>
      </div>

      <RenameDialog
        open={renameOpen}
        initialValue={conversation.title}
        onClose={() => setRenameOpen(false)}
        onConfirm={async (title) => {
          await dispatch(renameConversation({ id: conversation.id, title })).unwrap();
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        title="删除这个会话？"
        description="会话中的全部消息会一并删除，且无法恢复。"
        confirmText="删除会话"
        danger
        loading={deleting}
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteConversation}
      />
    </>
  );
}
