'use client';

import Link from 'next/link';
import { useCookieConsent } from './CookieConsentContext';

export function CookieConsent() {
  const { consent, accept, decline } = useCookieConsent();

  if (consent !== 'pending') return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white px-4 py-4 shadow-lg sm:px-6"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          We use cookies and similar technologies to analyse traffic and improve
          your experience. See our{' '}
          <Link href="/legal/cookies" className="underline hover:text-slate-900">
            Cookie Policy
          </Link>{' '}
          and{' '}
          <Link href="/legal/privacy" className="underline hover:text-slate-900">
            Privacy Policy
          </Link>{' '}
          for details.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={decline}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

/** Inline "Manage cookies" link — embed anywhere (e.g. footer). */
export function ManageCookiesLink() {
  const { decline } = useCookieConsent();
  return (
    <button
      onClick={() => {
        localStorage.removeItem('ab_cookie_consent');
        window.location.reload();
      }}
      className="text-sm underline hover:text-slate-900"
    >
      Manage cookies
    </button>
  );
}
