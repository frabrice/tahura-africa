import { useState, useCallback } from 'react';

interface RateLimitState {
  isLimited: boolean;
  remainingAttempts: number;
  cooldownMs: number;
  lastAttempt: number;
}

export function useRateLimit(maxAttempts: number, windowMs: number, cooldownMs: number) {
  const [state, setState] = useState<RateLimitState>({
    isLimited: false,
    remainingAttempts: maxAttempts,
    cooldownMs: 0,
    lastAttempt: 0,
  });

  const attempt = useCallback((): boolean => {
    const now = Date.now();
    const timeSinceLast = now - state.lastAttempt;

    if (state.isLimited) {
      if (timeSinceLast >= cooldownMs) {
        setState({
          isLimited: false,
          remainingAttempts: maxAttempts,
          cooldownMs: 0,
          lastAttempt: now,
        });
        return true;
      }
      return false;
    }

    if (timeSinceLast > windowMs) {
      // Reset window
      setState({
        isLimited: false,
        remainingAttempts: maxAttempts - 1,
        cooldownMs: 0,
        lastAttempt: now,
      });
      return true;
    }

    const remaining = state.remainingAttempts - 1;
    if (remaining <= 0) {
      setState({
        isLimited: true,
        remainingAttempts: 0,
        cooldownMs: cooldownMs - timeSinceLast,
        lastAttempt: now,
      });
      return false;
    }

    setState({
      isLimited: false,
      remainingAttempts: remaining,
      cooldownMs: 0,
      lastAttempt: now,
    });
    return true;
  }, [state, maxAttempts, windowMs, cooldownMs]);

  return { ...state, attempt };
}
