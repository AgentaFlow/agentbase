'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

type ConsentState = 'pending' | 'accepted' | 'declined';

interface CookieConsentContextValue {
  consent: ConsentState;
  accept: () => void;
  decline: () => void;
}

const STORAGE_KEY = 'ab_cookie_consent';

const CookieConsentContext = createContext<CookieConsentContextValue>({
  consent: 'pending',
  accept: () => {},
  decline: () => {},
});

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentState>('pending');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ConsentState | null;
    if (stored === 'accepted' || stored === 'declined') {
      setConsent(stored);
    }
  }, []);

  const accept = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setConsent('accepted');
  }, []);

  const decline = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'declined');
    setConsent('declined');
  }, []);

  return (
    <CookieConsentContext.Provider value={{ consent, accept, decline }}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  return useContext(CookieConsentContext);
}
