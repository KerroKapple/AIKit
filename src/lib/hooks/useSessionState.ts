'use client';
import { useEffect, useRef, useState } from 'react';

export function useSessionState<T>(
  key: string,
  initial: T,
  options: { hydrate?: (stored: T) => T } = {},
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw !== null) {
        const parsed = JSON.parse(raw) as T;
        setValue(options.hydrate ? options.hydrate(parsed) : parsed);
      }
    } catch {}
    hydrated.current = true;
  }, [key]);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue];
}
