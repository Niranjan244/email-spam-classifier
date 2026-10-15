import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
};

const borderStyles = {
  success: 'border-l-success',
  error: 'border-l-danger',
  warning: 'border-l-warning',
  info: 'border-l-primary'
};

const iconStyles = {
  success: 'text-success',
  error: 'text-danger',
  warning: 'text-warning',
  info: 'text-primary'
};

const Toast = ({ id, type = 'info', title, message, duration = 3000, onClose, className = '' }) => {
  const Icon = icons[type] || icons.info;

  useEffect(() => {
    if (!duration || !onClose) return;

    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      className={`bg-surface border border-border border-l-4 shadow-lg rounded-lg p-3.5 flex items-start gap-3 min-w-[280px] max-w-sm transition-all duration-150 animate-in slide-in-from-top-2 ${
        borderStyles[type] || borderStyles.info
      } ${className}`.trim()}
    >
      <Icon
        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconStyles[type] || iconStyles.info}`}
        aria-hidden="true"
      />
      <div className="flex-1 text-sm min-w-0">
        {title && <p className="font-semibold text-text leading-tight mb-0.5">{title}</p>}
        {message && <p className="text-xs text-text-muted leading-snug">{message}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={() => onClose(id)}
          aria-label="Close notification"
          className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 flex-shrink-0"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default Toast;
