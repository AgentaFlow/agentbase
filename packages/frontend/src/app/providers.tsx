'use client';

import { AuthProvider } from '@/context/auth-context';
import { CookieConsentProvider } from '@/components/analytics/CookieConsentContext';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CookieConsentProvider>
      <AuthProvider>{children}</AuthProvider>
    </CookieConsentProvider>
  );
}
