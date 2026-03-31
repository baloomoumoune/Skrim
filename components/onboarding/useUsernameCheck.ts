import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type UsernameStatus = 'idle' | 'typing' | 'checking' | 'available' | 'taken' | 'invalid';

export function useUsernameCheck() {
  const [status, setStatus] = useState<UsernameStatus>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const checkUsername = useCallback((username: string) => {
    // Cancel pending debounce
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const trimmed = username.trim();

    // Empty → idle
    if (trimmed.length === 0) {
      setStatus('idle');
      return;
    }

    // Too short → invalid
    if (trimmed.length < 3 || trimmed.length > 24) {
      setStatus('invalid');
      return;
    }

    // Valid length → debounce the RPC check
    setStatus('typing');

    timeoutRef.current = setTimeout(async () => {
      const currentRequestId = ++requestIdRef.current;
      setStatus('checking');

      try {
        const { data, error } = await (supabase.rpc as Function)('check_username_available', {
          p_username: trimmed,
        });

        // Ignore stale responses
        if (currentRequestId !== requestIdRef.current) return;

        if (error) {
          if (__DEV__) console.error('[UsernameCheck] RPC error:', error.message);
          setStatus('available'); // Fail open — let server validate on save
          return;
        }

        setStatus(data === true ? 'available' : 'taken');
      } catch {
        if (currentRequestId !== requestIdRef.current) return;
        setStatus('available'); // Fail open
      }
    }, 500);
  }, []);

  return { status, checkUsername };
}
