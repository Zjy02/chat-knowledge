import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { formatRelativeTime } from '../../../utils/format';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { RenameDialog } from '../../../components/RenameDialog';
import { useConversationStore } from '../../../stores/conversationStore';
import { toast } from '../../../stores/toastStore';
import type { ConversationSummary } from '../../../types';

interface ConversationRowProps {
  conversation: ConversationSummary;
  active: boolean;
  onOpen: (conversation: ConversationSummary) => void;
}

export function ConversationRow({ conversation, active, onOpen }: ConversationRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const rename = useConversationStore((state) => state.rename);
  const remove = useConversationStore((state) => state.remove);
  const startNewChat = useConversationStore((state) => state.startNewChat);
  const activeId = useConversationStore((state) => state.activeId);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const deleteConversation = async () => {
    setDeleting(true);
    try {
      await remove(conversation.id);
      setDeleteOpen(false);
      if (activeId === conversation.id) {
        startNewChat();
        navigate('/chat', { replace: true });
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className={`conv ${active ? 'active' : ''}`}>
        <button type="button" className="conv-open" onClick={() => onOpen(conversation)}>
          <MessageSquare className="conv-icon" size={13} />
          <span className="conv-body">
            <span className="conv-title">{conversation.title}</span>
            <span className="conv-time">
              {formatRelativeTime(conversation.last_message_at)}
              <span className="dot" />
              {conversation.message_count} 条消息
            </span>
          </span>
        </button>
        <div className="conv-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="conv-more"
            aria-label="会话操作"
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((value) => !value);
            }}
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="conv-menu">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen(false);
                  setRenameOpen(true);
                }}
              >
                <Pencil size={12} /> 重命名
              </button>
              <button
                type="button"
                className="danger"
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen(false);
                  setDeleteOpen(true);
                }}
              >
                <Trash2 size={12} /> 删除
              </button>
            </div>
          )}
        </div>
      </div>

      <RenameDialog
        open={renameOpen}
        initialValue={conversation.title}
        onClose={() => setRenameOpen(false)}
        onConfirm={(title) => rename(conversation.id, title)}
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
