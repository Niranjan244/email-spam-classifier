import { Inbox } from 'lucide-react';
import Button from './Button';

const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No items found',
  description,
  actionLabel,
  onAction,
  action,
  children
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-surface border border-border rounded-xl shadow-sm dark:shadow-none">
      <div className="flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-surface-muted text-text-muted">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>

      <h3 className="text-base font-semibold text-text">{title}</h3>
      {description && <p className="mt-1 text-sm text-text-muted max-w-sm">{description}</p>}

      {action && <div className="mt-4">{action}</div>}

      {!action && actionLabel && onAction && (
        <div className="mt-4">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

export default EmptyState;
