'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import api from '@/lib/api';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  streaming?: boolean;
}

interface StreamingChatProps {
  applicationId: string;
  userId: string;
  config: {
    aiProvider?: string;
    aiModel?: string;
    temperature?: number;
    systemPrompt?: string;
    maxTokens?: number;
  };
}

export default function StreamingChat({ applicationId, userId, config }: StreamingChatProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<{ abort: () => void } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const startConversation = async () => {
    try {
      const conv = await api.createConversation(applicationId, userId);
      setConversationId(conv.id);
      setMessages([]);
    } catch (err) {
      console.error('Failed to start conversation', err);
    }
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !conversationId || sending) return;
    const content = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content }]);
    setSending(true);

    const opts = {
      provider: config.aiProvider,
      model: config.aiModel,
      temperature: config.temperature ?? 0.7,
      system_prompt: config.systemPrompt || undefined,
      max_tokens: config.maxTokens ?? 2048,
    };

    if (useStreaming) {
      // Add empty assistant message for streaming
      setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

      abortRef.current = api.streamMessage(conversationId, content, opts, {
        onChunk: (chunk) => {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: last.content + chunk };
            }
            return updated;
          });
        },
        onDone: (fullResponse) => {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: fullResponse, streaming: false };
            }
            return updated;
          });
          setSending(false);
          abortRef.current = null;
        },
        onError: (error) => {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: `Error: ${error}`, streaming: false };
            }
            return updated;
          });
          setSending(false);
          abortRef.current = null;
        },
      });
    } else {
      try {
        const result = await api.sendMessage(conversationId, content, opts);
        setMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
      } catch (err: any) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
      } finally {
        setSending(false);
      }
    }
  }, [input, conversationId, sending, config, useStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const stopStreaming = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setSending(false);
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === 'assistant' && last.streaming) {
          updated[updated.length - 1] = { ...last, streaming: false, content: last.content + ' [stopped]' };
        }
        return updated;
      });
    }
  };

  return (
    <div className="bg-white rounded-xl border flex flex-col" style={{ height: '65vh' }}>
      {!conversationId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <span className="text-5xl block mb-4">💬</span>
            <h3 className="text-lg font-semibold mb-2">Test your AI application</h3>
            <p className="text-slate-500 text-sm mb-4">Start a conversation to test your AI configuration</p>
            <button onClick={startConversation} className="bg-brand-600 text-white px-6 py-2.5 rounded-lg hover:bg-brand-700 font-medium">
              Start Conversation
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-slate-400 py-8 text-sm">Send a message to start chatting</div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm ${msg.role === 'user' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.streaming && (
                    <span className="inline-block w-1.5 h-4 bg-brand-500 ml-0.5 animate-pulse rounded-sm" />
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message... (Shift+Enter for new line)"
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none resize-none text-sm"
                rows={1}
                disabled={sending}
              />
              {sending ? (
                <button onClick={stopStreaming} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 font-medium text-sm">
                  Stop
                </button>
              ) : (
                <button onClick={sendMessage} disabled={!input.trim()} className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium text-sm">
                  Send
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => { setConversationId(null); setMessages([]); }}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  New conversation
                </button>
                <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useStreaming}
                    onChange={(e) => setUseStreaming(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Stream responses
                </label>
              </div>
              <span className="text-xs text-slate-400">{messages.length} messages</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
