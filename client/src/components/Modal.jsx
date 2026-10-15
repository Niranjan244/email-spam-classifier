import { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({
  isOpen = false,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-lg',
  className = ''
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-150 animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className={`w-full ${maxWidth} bg-surface rounded-xl border border-border shadow-xl p-6 relative focus:outline-none transition-transform duration-150 animate-in zoom-in-95 ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-3">
          <div className="min-w-0 pr-4">
            {title && (
              <h2 id="modal-title" className="text-xl font-semibold text-text tracking-tight">
                {title}
              </h2>
            )}
            {description && <p className="text-sm text-text-muted mt-1">{description}</p>}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-surface-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 flex-shrink-0"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="py-2 text-sm text-text">{children}</div>

        {footer && (
          <div className="pt-4 mt-4 border-t border-border flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
