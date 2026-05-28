'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { MessageSquare, X, Send, Trash2, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatWidget() {
  const user  = useAuthStore(s => s.user);
  const [open, setOpen]       = useState(false);
  const [msgs, setMsgs]       = useState<any[]>([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unread, setUnread]   = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await api.get('/chat');
      setMsgs(data.data.messages);
    } catch {}
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Listen for real-time messages from SSE (via NotificationBell)
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.message) {
        setMsgs(prev => {
          const exists = prev.find(m => m.id === detail.message.id);
          if (exists) return prev;
          return [...prev, detail.message];
        });
        if (!open) setUnread(n => n + 1);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    };

    window.addEventListener('chat_message', handler);
    return () => window.removeEventListener('chat_message', handler);
  }, [user, open]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      load();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    }
  }, [open]);

  useEffect(() => {
    if (msgs.length > 0) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [msgs.length]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    const optimistic = { id: `tmp-${Date.now()}`, role: 'client', content: text, createdAt: new Date().toISOString(), sender: { name: user?.name } };
    setMsgs(prev => [...prev, optimistic]);

    try {
      const { data } = await api.post('/chat/send', { content: text });
      setMsgs(prev => prev.map(m => m.id === optimistic.id ? data.data : m));
    } catch {
      setMsgs(prev => prev.filter(m => m.id !== optimistic.id));
      setInput(text);
      toast.error('Erro ao enviar');
    }
    finally { setSending(false); }
  };

  const clearHistory = async () => {
    if (!confirm('Apagar todo o histórico de conversa?')) return;
    await api.delete('/chat').catch(() => {});
    setMsgs([]);
    toast.success('Histórico apagado');
  };

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      <button onClick={() => setOpen(v => !v)}
        style={{
          position: 'fixed', bottom: '5.5rem', right: '1.5rem', zIndex: 9998,
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(124,58,237,0.5)', transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => { (e.currentTarget as any).style.transform = 'scale(1.1)'; (e.currentTarget as any).style.boxShadow = '0 0 30px rgba(124,58,237,0.7)'; }}
        onMouseLeave={e => { (e.currentTarget as any).style.transform = 'scale(1)'; (e.currentTarget as any).style.boxShadow = '0 4px 20px rgba(124,58,237,0.5)'; }}>
        {open ? <X size={22} color="white" /> : <MessageSquare size={22} color="white" />}
        {unread > 0 && !open && (
          <span style={{ position: 'absolute', top: -4, right: -4, background: '#f43f5e', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {unread}
          </span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '9rem', right: '1.5rem', zIndex: 9997,
          width: 340, height: 480, borderRadius: 20, overflow: 'hidden',
          background: '#0a0818', border: '1.5px solid rgba(139,92,246,0.3)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(109,40,217,0.2))', borderBottom: '1px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare size={16} color="white" />
              </div>
              <div>
                <p style={{ fontWeight: 900, fontSize: 13, color: '#f1effe', margin: 0, fontFamily: "'Syne', sans-serif" }}>Suporte Francis Store</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
                  <p style={{ fontSize: 11, color: 'rgba(196,181,253,0.6)', margin: 0 }}>Online</p>
                </div>
              </div>
            </div>
            <button onClick={clearHistory} title="Apagar histórico"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(248,113,113,0.4)', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => { (e.currentTarget as any).style.color = '#f87171'; (e.currentTarget as any).style.background = 'rgba(248,113,113,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as any).style.color = 'rgba(248,113,113,0.4)'; (e.currentTarget as any).style.background = 'none'; }}>
              <Trash2 size={14} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Loader2 size={24} color="rgba(196,181,253,0.4)" className="animate-spin" />
              </div>
            ) : msgs.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10 }}>
                <MessageSquare size={32} color="rgba(196,181,253,0.15)" />
                <p style={{ color: 'rgba(196,181,253,0.35)', fontSize: 13, textAlign: 'center', margin: 0 }}>Olá! Como podemos te ajudar? 👋</p>
                <p style={{ color: 'rgba(196,181,253,0.2)', fontSize: 11, textAlign: 'center', margin: 0 }}>Envie uma mensagem e responderemos em breve</p>
              </div>
            ) : msgs.map((msg, i) => {
              const isClient = msg.role === 'client';
              return (
                <div key={msg.id || i} style={{ display: 'flex', justifyContent: isClient ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '80%', padding: '8px 12px', borderRadius: 16,
                    background: isClient ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'rgba(139,92,246,0.12)',
                    border: isClient ? 'none' : '1px solid rgba(139,92,246,0.2)',
                    borderBottomRightRadius: isClient ? 4 : 16,
                    borderBottomLeftRadius:  isClient ? 16 : 4,
                  }}>
                    {!isClient && (
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', margin: '0 0 3px', fontFamily: "'Syne', sans-serif" }}>
                        {msg.sender?.name || 'Admin'}
                      </p>
                    )}
                    <p style={{ fontSize: 13, color: isClient ? 'white' : 'rgba(226,217,243,0.9)', margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>{msg.content}</p>
                    <p style={{ fontSize: 9, color: isClient ? 'rgba(255,255,255,0.4)' : 'rgba(196,181,253,0.3)', margin: '4px 0 0', textAlign: isClient ? 'right' : 'left' }}>
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Privacy notice */}
          <div style={{ padding: '6px 12px', background: 'rgba(139,92,246,0.04)', borderTop: '1px solid rgba(139,92,246,0.1)' }}>
            <p style={{ fontSize: 10, color: 'rgba(196,181,253,0.35)', textAlign: 'center', margin: 0 }}>
              🔒 Só admins podem ver suas dúvidas
            </p>
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(139,92,246,0.15)', background: 'rgba(139,92,246,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(139,92,246,0.1)', border: '1.5px solid rgba(139,92,246,0.25)', borderRadius: 14, padding: '6px 8px 6px 14px' }}>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Digite uma mensagem..."
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e2d9f3', fontSize: 13, fontFamily: 'inherit' }} />
              <button onClick={send} disabled={sending || !input.trim()}
                style={{
                  width: 34, height: 34, borderRadius: 10, border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                  background: input.trim() ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'rgba(255,255,255,0.05)',
                  color: input.trim() ? 'white' : 'rgba(196,181,253,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  boxShadow: input.trim() ? '0 4px 12px rgba(124,58,237,0.4)' : 'none',
                  transition: 'all 0.15s',
                }}>
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}