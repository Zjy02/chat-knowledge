import { useEffect, useState } from 'react';
import { Modal } from './Modal';

interface RenameDialogProps {
  open: boolean;
  initialValue: string;
  onClose: () => void;
  onConfirm: (value: string) => Promise<void>;
}

export function RenameDialog({ open, initialValue, onClose, onConfirm }: RenameDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  const submit = async () => {
    const title = value.trim();
    if (!title || saving) return;
    setSaving(true);
    try {
      await onConfirm(title);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="重命名会话"
      description="一个好标题更容易在历史记录中找到。"
      width={420}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            取消
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
        </>
      }
    >
      <label className="field-label" htmlFor="rename-input">
        会话标题
      </label>
      <input
        id="rename-input"
        className="text-input"
        autoFocus
        maxLength={120}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') void submit();
        }}
        placeholder="例如：RAG 召回优化"
      />
    </Modal>
  );
}
