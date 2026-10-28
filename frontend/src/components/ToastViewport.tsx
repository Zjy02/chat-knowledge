import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useToastStore } from '../stores/toastStore';

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div className="toast-viewport" aria-live="polite">
      {toasts.map((item) => {
        const Icon = icons[item.kind];
        return (
          <div key={item.id} className={`toast toast-${item.kind}`}>
            <Icon size={15} />
            <span>{item.message}</span>
            <button type="button" aria-label="关闭提示" onClick={() => dismiss(item.id)}>
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
