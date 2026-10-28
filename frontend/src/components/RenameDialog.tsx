import { useEffect, useState } from 'react';
import { Button, Input } from 'antd';
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
        <div className="modal-actions">
          <Button onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button type="primary" onClick={submit} loading={saving}>
            保存
          </Button>
        </div>
      }
    >
      <label className="field-label" htmlFor="rename-input">
        会话标题
      </label>
      <Input
        id="rename-input"
        size="large"
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
