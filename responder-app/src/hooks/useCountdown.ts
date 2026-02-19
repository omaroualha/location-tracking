import { useState, useEffect, useCallback, useRef } from 'react';

interface UseCountdownOptions {
  initialSeconds: number;
  onTimeout?: () => void;
  autoStart?: boolean;
}

interface UseCountdownReturn {
  seconds: number;
  isRunning: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
  restart: () => void;
}

export function useCountdown({
  initialSeconds,
  onTimeout,
  autoStart = false,
}: UseCountdownOptions): UseCountdownReturn {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const onTimeoutRef = useRef(onTimeout);
  const hasTimedOut = useRef(false);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!isRunning) return;

    if (seconds <= 0) {
      setIsRunning(false);
      if (!hasTimedOut.current) {
        hasTimedOut.current = true;
        onTimeoutRef.current?.();
      }
      return;
    }

    const timer = setTimeout(() => {
      setSeconds((s) => s - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isRunning, seconds]);

  const start = useCallback(() => {
    hasTimedOut.current = false;
    setIsRunning(true);
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    hasTimedOut.current = false;
    setSeconds(initialSeconds);
    setIsRunning(false);
  }, [initialSeconds]);

  const restart = useCallback(() => {
    hasTimedOut.current = false;
    setSeconds(initialSeconds);
    setIsRunning(true);
  }, [initialSeconds]);

  return { seconds, isRunning, start, stop, reset, restart };
}
