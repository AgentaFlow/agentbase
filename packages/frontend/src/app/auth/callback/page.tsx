'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(`Authentication failed: ${errorParam.replace(/_/g, ' ')}`);
      return;
    }

    if (accessToken) {
      api.setToken(accessToken);
      if (refreshToken) api.setRefreshToken(refreshToken);
      router.replace('/dashboard');
    } else {
      setError('No authentication token received');
    }
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-xl shadow-sm border max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Authentication Failed</h2>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 font-medium"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-500">Completing sign in...</p>
      </div>
    </div>
  );
}
