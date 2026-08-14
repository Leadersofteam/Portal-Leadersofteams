'use client';

import { useEffect } from 'react';

/**
 * Rejestracja service workera — wyłącznie na produkcyjnym buildzie.
 *
 * W dev SW przechwytywałby zasoby HMR i dawał „duchy" po każdej edycji;
 * to klasyczne źródło godziny zmarnowanej na debugowanie nieistniejącego buga.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Brak SW to degradacja komfortu, nie awaria — portal działa dalej.
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return null;
}
