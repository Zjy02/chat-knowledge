import { Modal as AntModal } from 'antd';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

/**
 * Thin Ant Design adapter that keeps the product's title/description layout.
 * Using one wrapper means every dialog shares the same focus trap, ESC
 * handling, mask behavior and mobile layout.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 480,
}: ModalProps) {
  return (
    <AntModal
      open={open}
      onCancel={onClose}
      footer={footer}
      width={width}
      centered
      destroyOnHidden
      maskClosable
      className="app-modal"
      title={
        <div className="app-modal-title">
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
      }
    >
      <div className="app-modal-body">{children}</div>
    </AntModal>
  );
}
