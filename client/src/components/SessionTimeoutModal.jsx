import { ShieldAlert } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

const SessionTimeoutModal = ({ isOpen, secondsRemaining, onStayLoggedIn, onLogout }) => {
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / 60) * 100));

  const formatSeconds = (sec) => {
    const s = Math.max(0, sec);
    return `00:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      maxWidth="max-w-md"
      className="text-center"
      // Prevent accidental backdrop click dismiss; user must explicitly choose
      onClose={null}
    >
      <div className="flex flex-col items-center py-2 space-y-4">
        {/* Animated Warning Icon */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-warning-soft text-warning flex items-center justify-center animate-pulse">
            <ShieldAlert className="w-8 h-8" aria-hidden="true" />
          </div>
        </div>

        {/* Title and Description */}
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-text tracking-tight">Session Inactivity Warning</h2>
          <p className="text-xs sm:text-sm text-text-muted leading-relaxed max-w-sm">
            You have been inactive for 9 Minutes. To protect your account, you will be automatically
            logged out in:
          </p>
        </div>

        {/* Live Countdown Display */}
        <div className="w-full bg-surface-muted/60 border border-border rounded-xl p-4 space-y-2">
          <div className="text-4xl font-extrabold text-warning font-mono tracking-wider">
            {formatSeconds(secondsRemaining)}
          </div>
          <div className="w-full bg-border/60 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ease-linear ${
                secondsRemaining <= 15 ? 'bg-danger' : 'bg-warning'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-text-muted">
            Click <strong>Stay Logged In</strong> to continue your work without interruption.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full grid grid-cols-2 gap-3 pt-2">
          <Button variant="secondary" onClick={onLogout} className="w-full">
            Log Out Now
          </Button>
          <Button variant="primary" onClick={onStayLoggedIn} className="w-full" autoFocus>
            Stay Logged In
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SessionTimeoutModal;
