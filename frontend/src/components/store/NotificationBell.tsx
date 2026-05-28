'use client';
import { useEffect, useRef, useState } from 'react';
import { Bell, Send, CheckCheck, MessageSquare, Info, AlertCircle, Gift, X, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

const TYPE_ICON: Record<string, any> = { INFO: Info, REPLY: MessageSquare, PROMO: Gift, WARNING: AlertCircle };
const TYPE_COLOR: Record<string, string> = { INFO: '#a78bfa', REPLY: '#34d399', PROMO: '#fbbf24', WARNING: '#f87171' };

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function NotificationBell() {
  const user  = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.token);
  const [open, setOpen]       = useState(false);
  const [notifs, setNotifs]   = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [unread, setUnread]   = useState(0);
  const [tab, setTab]         = useState<'notifs'|'history'>('notifs');
  const [reply, setReply]     = useState('');
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const sseRef   = useRef<EventSource | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const msgEnd   = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifs(data.data.notifications);
      setUnread(data.data.unread);
    } catch {}
  };

  const loadHistory = async () => {
    try {
      const { data } = await api.get('/notifications/my-history');
      setHistory(data.data);
    } catch {}
  };

  const clearHistory = async () => {
    if (!confirm('Apagar todo o histórico de mensagens? Esta ação não pode ser desfeita.')) return;
    setClearing(true);
    try {
      await api.delete('/notifications/history');
      setNotifs([]);
      setHistory([]);
      setUnread(0);
      toast.success('Histórico apagado!');
    } catch { toast.error('Erro ao apagar histórico'); }
    finally { setClearing(false); }
  };

  useEffect(() => {
    if (!user || !token) return;
    load();
    loadHistory();

    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000/api';
    let es: EventSource;
    let retryTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      es = new EventSource(`${apiUrl}/notifications/stream?token=${token}`);
      sseRef.current = es;
      es.onmessage = (e) => {
        try {
          const p = JSON.parse(e.data);
          if (p.type === 'NEW_NOTIFICATION') {
            setNotifs(prev => [p.notification, ...prev]);
            setUnread(prev => prev + 1);
            setHistory(prev => [...prev, p.notification]);
            toast(`🔔 ${p.notification.title}`, { duration: 4000 });
          }
        } catch {}
      };
      es.onerror = () => { es.close(); retryTimer = setTimeout(connect, 3000); };
    };
    connect();
    return () => { clearTimeout(retryTimer); sseRef.current?.close(); };
  }, [user, token]);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => {
    if (tab === 'history') setTimeout(() => msgEnd.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [tab, history.length]);

  const markAllRead = async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnread(0);
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api.post('/notifications/reply', { message: reply });
      const fake = { id: Date.now(), type: 'REPLY', title: 'Você', message: reply, createdAt: new Date().toISOString(), isRead: true, data: { from: 'client' } };
      setHistory(prev => [...prev, fake]);
      setReply('');
      toast.success('Mensagem enviada!');
    } catch { toast.error('Erro ao enviar'); }
    finally { setSending(false); }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={() => { setOpen(v => !v); if (!open) { markAllRead(); loadHistory(); } }}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all"
        style={{ background: open ? 'rgba(139,92,246,0.15)' : 'transparent', border: open ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent' }}
        onMouseEnter={e => (e.currentTarget as any).style.background = 'rgba(139,92,246,0.12)'}
        onMouseLeave={e => { if (!open) (e.currentTarget as any).style.background = 'transparent'; }}>
        <Bell size={18} style={{ color: unread > 0 ? '#a78bfa' : 'var(--text-muted)' }} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-black"
            style={{ background: '#7c3aed', fontSize: 9 }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 rounded-2xl overflow-hidden z-50"
          style={{ background: '#0a0818', border: '1px solid rgba(139,92,246,0.25)', boxShadow: '0 20px 60px rgba(0,0,0,0.7)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(139,92,246,0.15)', background: 'rgba(139,92,246,0.07)' }}>
            <div className="flex gap-1">
              {[
                { id: 'notifs',  label: 'Notificações', count: unread },
                { id: 'history', label: 'Mensagens', count: 0 },
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id as any)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all"
                  style={{ background: tab === t.id ? 'rgba(139,92,246,0.2)' : 'transparent', color: tab === t.id ? '#c4b5fd' : 'rgba(196,181,253,0.4)', border: tab === t.id ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent' }}>
                  {t.label}
                  {t.count > 0 && <span style={{ background: '#7c3aed', color: 'white', borderRadius: 999, padding: '0 5px', fontSize: 9 }}>{t.count}</span>}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {/* Clear history button */}
              <button onClick={clearHistory} disabled={clearing}
                title="Apagar histórico"
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                style={{ color: 'rgba(248,113,113,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as any).style.color = '#f87171'; (e.currentTarget as any).style.background = 'rgba(248,113,113,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as any).style.color = 'rgba(248,113,113,0.5)'; (e.currentTarget as any).style.background = 'none'; }}>
                <Trash2 size={13} />
              </button>
              <button onClick={() => setOpen(false)} style={{ color: 'rgba(196,181,253,0.3)', background: 'none', border: 'none', cursor: 'pointer', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Notifications tab */}
          {tab === 'notifs' && (
            <div className="overflow-y-auto flex-1" style={{ maxHeight: 340 }}>
              {notifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Bell size={28} style={{ color: 'rgba(196,181,253,0.2)' }} />
                  <p className="text-xs" style={{ color: 'rgba(196,181,253,0.35)' }}>Nenhuma notificação</p>
                </div>
              ) : notifs.map(n => {
                const Icon  = TYPE_ICON[n.type] || Info;
                const color = TYPE_COLOR[n.type] || '#a78bfa';
                return (
                  <div key={n.id} className="px-4 py-3"
                    style={{ background: n.isRead ? 'transparent' : 'rgba(139,92,246,0.05)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                        <Icon size={13} style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold truncate" style={{ color: n.isRead ? 'rgba(196,181,253,0.6)' : '#e2d9f3' }}>{n.title}</p>
                          <span className="text-xs flex-shrink-0" style={{ color: 'rgba(196,181,253,0.3)' }}>{timeAgo(n.createdAt)}</span>
                        </div>
                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'rgba(196,181,253,0.5)' }}>{n.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* History/Chat tab */}
          {tab === 'history' && (
            <>
              <div className="overflow-y-auto flex-1 px-3 py-3 space-y-2" style={{ maxHeight: 300 }}>
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <MessageSquare size={28} style={{ color: 'rgba(196,181,253,0.2)' }} />
                    <p className="text-xs" style={{ color: 'rgba(196,181,253,0.35)' }}>Nenhuma mensagem ainda</p>
                  </div>
                ) : history.map((n, i) => {
                  const isFromClient = (n.data as any)?.from === 'client';
                  return (
                    <div key={n.id || i} className={`flex ${isFromClient ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[85%] px-3 py-2 rounded-2xl"
                        style={{
                          background: isFromClient ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'rgba(139,92,246,0.12)',
                          border: isFromClient ? 'none' : '1px solid rgba(139,92,246,0.2)',
                          borderBottomRightRadius: isFromClient ? 4 : 16,
                          borderBottomLeftRadius:  isFromClient ? 16 : 4,
                        }}>
                        {!isFromClient && <p className="text-xs font-bold mb-0.5" style={{ color: '#a78bfa' }}>Admin</p>}
                        <p className="text-xs leading-relaxed" style={{ color: isFromClient ? 'white' : 'rgba(226,217,243,0.85)' }}>{n.message}</p>
                        <p style={{ fontSize: 9, color: isFromClient ? 'rgba(255,255,255,0.4)' : 'rgba(196,181,253,0.3)', textAlign: isFromClient ? 'right' : 'left', margin: '4px 0 0' }}>
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={msgEnd} />
              </div>
              <div style={{ borderTop: '1px solid rgba(139,92,246,0.15)', padding: '0.625rem' }}>
                <div className="flex items-center gap-2 rounded-xl px-3 py-2"
                  style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <input value={reply} onChange={e => setReply(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendReply()}
                    placeholder="Escreva uma mensagem..."
                    className="flex-1 bg-transparent text-xs outline-none"
                    style={{ color: '#e2d9f3' }} />
                  <button onClick={sendReply} disabled={sending || !reply.trim()}
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: reply.trim() ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'transparent', color: reply.trim() ? 'white' : 'rgba(196,181,253,0.3)', border: 'none', cursor: 'pointer' }}>
                    <Send size={12} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}