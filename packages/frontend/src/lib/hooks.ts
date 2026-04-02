'use client';

import { useState, useEffect, useCallback } from 'react';
import api from './api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function useApi<T>(fetcher: () => Promise<T>, deps: any[] = []): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// --- Application hooks ---

export function useApplications() {
  return useApi(() => api.getApplications(), []);
}

export function useApplication(id: string) {
  return useApi(() => api.getApplication(id), [id]);
}

export function useCreateApplication() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (data: { name: string; description?: string; config?: any }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.createApplication(data);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { create, loading, error };
}

export function useDeleteApplication() {
  const [loading, setLoading] = useState(false);

  const remove = async (id: string) => {
    setLoading(true);
    try {
      await api.deleteApplication(id);
    } finally {
      setLoading(false);
    }
  };

  return { remove, loading };
}

// --- Plugin hooks ---

export function usePlugins() {
  return useApi(() => api.getPlugins(), []);
}

// --- Theme hooks ---

export function useThemes() {
  return useApi(() => api.getThemes(), []);
}

// --- AI hooks ---

export function useProviders() {
  return useApi(() => api.getProviders(), []);
}

export function useSendMessage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (conversationId: string, content: string, options?: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.sendMessage(conversationId, content, options);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { send, loading, error };
}

// --- Prompt Template hooks ---

export function usePromptTemplates(applicationId: string) {
  return useApi(() => api.getPromptTemplates(applicationId), [applicationId]);
}

// --- Installed Plugin hooks ---

export function useInstalledPlugins(appId: string) {
  return useApi(() => api.getInstalledPlugins(appId), [appId]);
}

// --- Conversation hooks ---

export function useConversations(applicationId: string) {
  return useApi(() => api.getConversationsByApp(applicationId), [applicationId]);
}
