import { AlertCircle } from 'lucide-react';
import Button from './Button';

const ErrorState = ({
  title = 'Unable to load data',
  message,
  onRetry,
  retryText = 'Retry',
  children
}) => {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center p-8 text-center bg-surface border border-danger/25 rounded-xl shadow-sm dark:shadow-none"
    >
      <div className="flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-danger-soft text-danger">
        <AlertCircle className="w-6 h-6" aria-hidden="true" />
      </div>

      <h3 className="text-base font-semibold text-text">{title}</h3>
      {message && <p className="mt-1 text-sm text-text-muted max-w-sm">{message}</p>}

      {onRetry && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onRetry}>
            {retryText}
          </Button>
        </div>
      )}

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

export default ErrorState;
