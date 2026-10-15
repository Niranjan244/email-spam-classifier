import { useState, useEffect, useRef, useCallback } from 'react';

// Total session timeout: 10 minutes (600,000 ms)
// Warning triggers after 9 minutes of inactivity, giving a 60-second live countdown
const DEFAULT_IDLE_TIME = 9 * 60 * 1000; // 9 minutes
const DEFAULT_COUNTDOWN = 60; // 60 seconds

export const useSessionTimeout = ({
  idleTimeMs = DEFAULT_IDLE_TIME,
  countdownSeconds = DEFAULT_COUNTDOWN,
  onTimeout,
  enabled = true
} = {}) => {
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(countdownSeconds);

  const lastActivityRef = useRef(Date.now());
  const countdownIntervalRef = useRef(null);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const stayLoggedIn = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsWarningOpen(false);
    setSecondsRemaining(countdownSeconds);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, [countdownSeconds]);

  const logOutNow = useCallback(() => {
    setIsWarningOpen(false);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (onTimeoutRef.current) {
      onTimeoutRef.current();
    }
  }, []);

  // Track user activity when warning modal is NOT open
  useEffect(() => {
    if (!enabled) return;

    let throttleTimeout = null;
    const handleActivity = () => {
      // If warning modal is open, user must explicitly click "Stay Logged In"
      if (isWarningOpen) return;

      if (!throttleTimeout) {
        lastActivityRef.current = Date.now();
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null;
        }, 1000);
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((evt) => {
      window.addEventListener(evt, handleActivity, { passive: true });
    });

    const interval = setInterval(() => {
      if (isWarningOpen) return;
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= idleTimeMs) {
        setIsWarningOpen(true);
        setSecondsRemaining(countdownSeconds);
      }
    }, 1000);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleActivity);
      });
      clearInterval(interval);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [enabled, idleTimeMs, countdownSeconds, isWarningOpen]);

  // Handle live countdown when warning modal is open
  useEffect(() => {
    if (!isWarningOpen || !enabled) return;

    countdownIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          logOutNow();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [isWarningOpen, enabled, logOutNow]);

  return {
    isWarningOpen,
    secondsRemaining,
    stayLoggedIn,
    logOutNow
  };
};

export default useSessionTimeout;
