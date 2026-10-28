import { Button } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = '确认',
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      width={420}
      footer={
        <div className="modal-actions">
          <Button onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button type="primary" danger={danger} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </div>
      }
    >
      <div className={`confirm-illustration ${danger ? 'danger' : ''}`}>
        <WarningOutlined />
      </div>
    </Modal>
  );
}
