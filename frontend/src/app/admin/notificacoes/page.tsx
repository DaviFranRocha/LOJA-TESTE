'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Bell, Send, Users, MessageSquare, CheckCheck, Gift, AlertTriangle, Info, Sparkles, Trash2, X, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const TYPES = [
  { value: 'INFO',    label: 'Aviso',    emoji: '📢', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
  { value: 'PROMO',  label: 'Promoção', emoji: '🎁', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)' },
  { value: 'WARNING',label: 'Alerta',   emoji: '⚠️', color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
];

function fmtTime(d: string) {
  const dt = new Date(d);
  return dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) + ' · ' + dt.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff/60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min`;
  const h = Math.floor(m/60);
  if (h < 24) return `${h}h`;
  return new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
}

export default function AdminNotificacoesPage() {
  const token = useAuthStore(s => s.token);
  const user  = useAuthStore(s => s.user);
  const [users, setUsers]       = useState<any[]>([]);
  const [replies, setReplies]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [tab, setTab]           = useState<'send'|'inbox'|'convos'>('send');
  const [unread, setUnread]     = useState(0);
  const [form, setForm]         = useState({ title: '', message: '', type: 'INFO', userId: 'all' });
  const [search, setSearch]     = useState('');
  const [activeConvo, setActiveConvo] = useState<any>(null);
  const sseRef  = useRef<EventSource | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/admin/users?limit=200').then(r => setUsers(r.data.data || [])).catch(() => {});
    loadInbox();
  }, []);

  useEffect(() => {
    if (!token) return;
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000/api';
    const es = new EventSource(`${apiUrl}/notifications/stream?token=${token}`);
    sseRef.current = es;
    es.onmessage = (e) => {
      try {
        const p = JSON.parse(e.data);
        if (p.type === 'NEW_NOTIFICATION' && p.notification?.type === 'REPLY') {
          setReplies(prev => [p.notification, ...prev]);
          setUnread(n => n + 1);
          toast(`💬 ${p.notification.title}`, { duration: 5000 });
        }
      } catch {}
    };
    return () => es.close();
  }, [token]);

  // Scroll to bottom when convo opens or messages change
  useEffect(() => {
    if (activeConvo) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [activeConvo]);

  const loadInbox = async () => {
    try {
      const { data } = await api.get('/notifications');
      const r = (data.data.notifications || []).filter((n: any) => ['REPLY','ADMIN_SENT'].includes(n.type));
      setReplies(r);
      setUnread(r.filter((n: any) => !n.isRead && n.type === 'REPLY').length);
    } catch {}
  };

  const markAll = async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    setReplies(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnread(0);
  };

  const markOne = async (id: string) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    setReplies(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const clearClientHistory = async (clientId: string, clientName: string) => {
    if (!confirm(`Apagar histórico com ${clientName}?`)) return;
    try {
      await api.delete(`/notifications/admin-history/${clientId}`);
      setReplies(prev => prev.filter((n: any) => {
        const d = n.data as any;
        return d?.senderId !== clientId && d?.toId !== clientId;
      }));
      setActiveConvo(null);
      toast.success('Histórico apagado!');
    } catch { toast.error('Erro ao apagar'); }
  };

  const clearAllHistory = async () => {
    if (!confirm('Apagar TODO o histórico de mensagens?')) return;
    try {
      await api.delete('/notifications/history');
      setReplies([]);
      setUnread(0);
      setActiveConvo(null);
      toast.success('Histórico apagado!');
    } catch { toast.error('Erro ao apagar'); }
  };

  const send = async () => {
    if (!form.title.trim() || !form.message.trim()) { toast.error('Preencha título e mensagem'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/notifications/send', form);
      toast.success(`✅ Enviado para ${data.sent} usuário${data.sent !== 1 ? 's' : ''}!`);
      setForm(f => ({ ...f, title: '', message: '' }));
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erro ao enviar'); }
    finally { setLoading(false); }
  };

  const customers = users.filter(u => u.role === 'CUSTOMER');
  const filteredCustomers = customers.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );
  const selType = TYPES.find(t => t.value === form.type)!;

  // Build conversations map
  const convoMap: Record<string, any> = {};
  replies.forEach((n: any) => {
    const d = n.data as any;
    if (n.type === 'REPLY') {
      const cid = d?.senderId; if (!cid) return;
      if (!convoMap[cid]) convoMap[cid] = { clientId: cid, clientName: d.senderName||'Cliente', clientEmail: d.senderEmail||'', messages: [], unread: 0 };
      convoMap[cid].messages.push({ ...n, direction: 'incoming' });
      if (!n.isRead) convoMap[cid].unread++;
    } else if (n.type === 'ADMIN_SENT') {
      const cid = d?.toId; if (!cid) return;
      if (!convoMap[cid]) convoMap[cid] = { clientId: cid, clientName: d.toName||'Cliente', clientEmail: '', messages: [], unread: 0 };
      convoMap[cid].messages.push({ ...n, direction: 'outgoing' });
    }
  });
  const convos = Object.values(convoMap).sort((a: any, b: any) => {
    const la = a.messages[a.messages.length-1]?.createdAt || '';
    const lb = b.messages[b.messages.length-1]?.createdAt || '';
    return new Date(lb).getTime() - new Date(la).getTime();
  });

  const activeMessages = activeConvo
    ? (convoMap[activeConvo.clientId]?.messages || []).slice().sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];

  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto', background: '#07061a', minHeight: '100vh', color: '#e2d9f3' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={18} color="#a78bfa" />
        </div>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:22, color:'#f1effe', margin:0 }}>Notificações</h1>
        {unread > 0 && <span style={{ background:'rgba(52,211,153,0.15)', border:'1px solid rgba(52,211,153,0.3)', color:'#34d399', borderRadius:999, padding:'2px 10px', fontSize:12, fontWeight:700 }}>{unread} nova{unread!==1?'s':''}</span>}
      </div>
      <p style={{ color:'rgba(196,181,253,0.5)', fontSize:13, marginBottom:24 }}>Envie mensagens e veja respostas em tempo real</p>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        {[
          { id:'send',   label:'Enviar',         icon: Send },
          { id:'inbox',  label:`Caixa de Entrada${unread>0?` (${unread})`:''}`, icon: MessageSquare },
          { id:'convos', label:'Histórico',       icon: MessageSquare },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id as any); if(t.id==='inbox') markAll(); }}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 16px', borderRadius:12, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"'Syne',sans-serif", transition:'all 0.15s', background: tab===t.id?'rgba(139,92,246,0.2)':'rgba(255,255,255,0.04)', border:`1.5px solid ${tab===t.id?'rgba(139,92,246,0.5)':'rgba(255,255,255,0.07)'}`, color: tab===t.id?'#c4b5fd':'rgba(196,181,253,0.45)' }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── SEND ── */}
      {tab === 'send' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:20 }}>
          <div style={{ background:'rgba(139,92,246,0.06)', border:'1.5px solid rgba(139,92,246,0.18)', borderRadius:20, padding:'1.75rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:22 }}>
              <Sparkles size={16} color="#a78bfa" />
              <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, color:'#e2d9f3', fontSize:15 }}>Nova Notificação</span>
            </div>
            {/* Type */}
            <div style={{ marginBottom:18 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(196,181,253,0.5)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Tipo</label>
              <div style={{ display:'flex', gap:8 }}>
                {TYPES.map(t => (
                  <button key={t.value} onClick={() => setForm(f=>({...f,type:t.value}))}
                    style={{ padding:'6px 14px', borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.15s', background:form.type===t.value?t.bg:'rgba(255,255,255,0.04)', border:`1.5px solid ${form.type===t.value?t.border:'rgba(255,255,255,0.08)'}`, color:form.type===t.value?t.color:'rgba(196,181,253,0.4)', boxShadow:form.type===t.value?`0 0 12px ${t.color}30`:'none' }}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Search + Select */}
            <div style={{ marginBottom:18 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(196,181,253,0.5)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Destinatário</label>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Pesquisar cliente..."
                style={{ width:'100%', padding:'8px 12px', borderRadius:10, fontSize:12, outline:'none', background:'rgba(139,92,246,0.08)', border:'1.5px solid rgba(139,92,246,0.2)', color:'#e2d9f3', marginBottom:8, boxSizing:'border-box' }}
                onFocus={e=>e.currentTarget.style.borderColor='rgba(167,139,250,0.6)'}
                onBlur={e=>e.currentTarget.style.borderColor='rgba(139,92,246,0.2)'} />
              <select value={form.userId} onChange={e=>setForm(f=>({...f,userId:e.target.value}))}
                style={{ width:'100%', padding:'10px 14px', borderRadius:12, fontSize:13, outline:'none', background:'#0f0c26', border:'1.5px solid rgba(139,92,246,0.25)', color:'#e2d9f3', appearance:'none', cursor:'pointer', colorScheme:'dark' }}>
                <option value="all" style={{background:'#0f0c26',color:'#e2d9f3'}}>👥 Todos os clientes ({customers.length})</option>
                {filteredCustomers.map(u => <option key={u.id} value={u.id} style={{background:'#0f0c26',color:'#e2d9f3'}}>{u.name} — {u.email}</option>)}
              </select>
              {search && <p style={{fontSize:11,color:'rgba(196,181,253,0.4)',marginTop:5}}>{filteredCustomers.length} resultado{filteredCustomers.length!==1?'s':''}</p>}
            </div>
            {/* Title */}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(196,181,253,0.5)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Título</label>
              <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Ex: Promoção especial hoje!"
                style={{ width:'100%', padding:'10px 14px', borderRadius:12, fontSize:13, outline:'none', background:'rgba(139,92,246,0.1)', border:'1.5px solid rgba(139,92,246,0.25)', color:'#e2d9f3', boxSizing:'border-box' }}
                onFocus={e=>e.currentTarget.style.borderColor='rgba(167,139,250,0.6)'}
                onBlur={e=>e.currentTarget.style.borderColor='rgba(139,92,246,0.25)'} />
            </div>
            {/* Message */}
            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(196,181,253,0.5)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Mensagem</label>
              <textarea value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} placeholder="Digite a mensagem aqui..." rows={4}
                style={{ width:'100%', padding:'10px 14px', borderRadius:12, fontSize:13, outline:'none', background:'rgba(139,92,246,0.1)', border:'1.5px solid rgba(139,92,246,0.25)', color:'#e2d9f3', resize:'none', boxSizing:'border-box', fontFamily:'inherit' }}
                onFocus={e=>e.currentTarget.style.borderColor='rgba(167,139,250,0.6)'}
                onBlur={e=>e.currentTarget.style.borderColor='rgba(139,92,246,0.25)'} />
            </div>
            {/* Preview */}
            {(form.title||form.message) && (
              <div style={{ marginBottom:20, padding:'12px 14px', borderRadius:12, background:selType.bg, border:`1px solid ${selType.border}` }}>
                <p style={{ fontSize:11, color:selType.color, fontWeight:700, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.08em' }}>Preview</p>
                {form.title && <p style={{ fontSize:13, fontWeight:700, color:'#e2d9f3', marginBottom:2 }}>{form.title}</p>}
                {form.message && <p style={{ fontSize:12, color:'rgba(226,217,243,0.7)', margin:0 }}>{form.message}</p>}
              </div>
            )}
            <button onClick={send} disabled={loading}
              style={{ width:'100%', padding:'12px', borderRadius:12, fontWeight:900, fontSize:14, color:'white', border:'none', cursor:loading?'not-allowed':'pointer', fontFamily:"'Syne',sans-serif", background:'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow:'0 4px 20px rgba(124,58,237,0.4)', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
              onMouseEnter={e=>(e.currentTarget as any).style.filter='brightness(1.15)'}
              onMouseLeave={e=>(e.currentTarget as any).style.filter='none'}>
              {loading?<><div style={{width:16,height:16,border:'2px solid white',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>Enviando...</>:<><Send size={15}/>Enviar Notificação</>}
            </button>
          </div>
          {/* Stats */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { label:'Total de clientes',  value:customers.length, icon:Users,         color:'#a78bfa' },
              { label:'Respostas recebidas',value:replies.filter(r=>r.type==='REPLY').length, icon:MessageSquare, color:'#34d399' },
              { label:'Não lidas',           value:unread,           icon:Bell,          color:'#fbbf24' },
            ].map((s,i)=>(
              <div key={i} style={{ background:'rgba(139,92,246,0.06)', border:'1.5px solid rgba(139,92,246,0.15)', borderRadius:16, padding:'16px 20px', display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:42, height:42, borderRadius:12, background:`${s.color}18`, border:`1px solid ${s.color}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <s.icon size={18} color={s.color} />
                </div>
                <div>
                  <p style={{ fontSize:26, fontWeight:900, color:'#f1effe', fontFamily:"'Syne',sans-serif", margin:0, lineHeight:1 }}>{s.value}</p>
                  <p style={{ fontSize:12, color:'rgba(196,181,253,0.45)', margin:'4px 0 0' }}>{s.label}</p>
                </div>
              </div>
            ))}
            <div style={{ background:'rgba(52,211,153,0.05)', border:'1px solid rgba(52,211,153,0.15)', borderRadius:16, padding:'14px 16px' }}>
              <p style={{ fontSize:11, fontWeight:700, color:'#34d399', marginBottom:6 }}>💡 Dica</p>
              <p style={{ fontSize:11, color:'rgba(196,181,253,0.5)', lineHeight:1.5, margin:0 }}>Notificações chegam em tempo real no sino 🔔 da loja. Clientes podem te responder!</p>
            </div>
          </div>
        </div>
      )}

      {/* ── INBOX ── */}
      {tab === 'inbox' && (
        <div style={{ background:'rgba(139,92,246,0.05)', border:'1.5px solid rgba(139,92,246,0.15)', borderRadius:20, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:'1px solid rgba(139,92,246,0.12)', background:'rgba(139,92,246,0.07)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <MessageSquare size={16} color="#34d399" />
              <span style={{ fontWeight:900, fontSize:14, color:'#e2d9f3', fontFamily:"'Syne',sans-serif" }}>Respostas dos Clientes</span>
              {replies.filter(r=>r.type==='REPLY').length>0 && <span style={{ background:'rgba(52,211,153,0.15)', color:'#34d399', borderRadius:999, padding:'1px 8px', fontSize:11, fontWeight:700 }}>{replies.filter(r=>r.type==='REPLY').length}</span>}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={markAll} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'rgba(196,181,253,0.4)', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}
                onMouseEnter={e=>(e.currentTarget as any).style.color='#a78bfa'}
                onMouseLeave={e=>(e.currentTarget as any).style.color='rgba(196,181,253,0.4)'}>
                <CheckCheck size={13}/> Marcar lidas
              </button>
              <button onClick={clearAllHistory} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'rgba(248,113,113,0.5)', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}
                onMouseEnter={e=>(e.currentTarget as any).style.color='#f87171'}
                onMouseLeave={e=>(e.currentTarget as any).style.color='rgba(248,113,113,0.5)'}>
                🗑️ Apagar tudo
              </button>
            </div>
          </div>
          <div style={{ maxHeight:520, overflowY:'auto' }}>
            {replies.filter(r=>r.type==='REPLY').length===0 ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 20px', gap:12 }}>
                <MessageSquare size={36} color="rgba(196,181,253,0.15)" />
                <p style={{ color:'rgba(196,181,253,0.35)', fontSize:14, margin:0 }}>Nenhuma resposta ainda</p>
              </div>
            ) : replies.filter(r=>r.type==='REPLY').map((n,i,arr)=>{
              const meta = n.data as any;
              return (
                <div key={n.id||i} style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'14px 20px', borderBottom:i<arr.length-1?'1px solid rgba(255,255,255,0.04)':'none', background:n.isRead?'transparent':'rgba(52,211,153,0.03)' }}>
                  <div style={{ width:38, height:38, borderRadius:12, background:'linear-gradient(135deg,#7c3aed,#4f46e5)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color:'white', fontSize:14, flexShrink:0, fontFamily:"'Syne',sans-serif" }}>
                    {(meta?.senderName||'C')[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:4 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontWeight:700, fontSize:13, color:'#e2d9f3' }}>{meta?.senderName||'Cliente'}</span>
                        {meta?.senderEmail && <span style={{ fontSize:11, color:'rgba(196,181,253,0.35)' }}>{meta.senderEmail}</span>}
                        {!n.isRead && <span style={{ width:6, height:6, borderRadius:'50%', background:'#34d399', display:'inline-block' }}/>}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                        <span style={{ fontSize:11, color:'rgba(196,181,253,0.3)' }}>{timeAgo(n.createdAt)}</span>
                        {!n.isRead && <button onClick={()=>markOne(n.id)} style={{ fontSize:10, padding:'2px 8px', borderRadius:6, background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.25)', color:'#34d399', cursor:'pointer', fontWeight:700 }}>✓ lida</button>}
                        <button onClick={()=>clearClientHistory(meta?.senderId, meta?.senderName||'cliente')}
                          style={{ fontSize:10, padding:'2px 8px', borderRadius:6, background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', color:'rgba(248,113,113,0.6)', cursor:'pointer' }}
                          onMouseEnter={e=>(e.currentTarget as any).style.color='#f87171'}
                          onMouseLeave={e=>(e.currentTarget as any).style.color='rgba(248,113,113,0.6)'}>🗑️</button>
                      </div>
                    </div>
                    <div style={{ display:'inline-block', padding:'8px 12px', borderRadius:14, borderBottomLeftRadius:4, background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.2)', maxWidth:'85%' }}>
                      <p style={{ fontSize:13, color:'rgba(226,217,243,0.88)', margin:0, lineHeight:1.5, wordBreak:'break-word' }}>{n.message}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── HISTÓRICO ── */}
      {tab === 'convos' && (
        <div style={{ display:'flex', height:580, background:'rgba(139,92,246,0.05)', border:'1.5px solid rgba(139,92,246,0.15)', borderRadius:20, overflow:'hidden' }}>

          {/* Lista de conversas */}
          <div style={{ width:260, borderRight:'1px solid rgba(139,92,246,0.15)', display:'flex', flexDirection:'column', flexShrink:0 }}>
            <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(139,92,246,0.12)', background:'rgba(139,92,246,0.07)' }}>
              <p style={{ fontWeight:900, fontSize:13, color:'#e2d9f3', margin:0, fontFamily:"'Syne',sans-serif" }}>Conversas</p>
            </div>
            <div style={{ flex:1, overflowY:'auto' }}>
              {convos.length===0 ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:8, padding:20 }}>
                  <MessageSquare size={28} color="rgba(196,181,253,0.2)" />
                  <p style={{ color:'rgba(196,181,253,0.3)', fontSize:12, textAlign:'center', margin:0 }}>Nenhuma conversa ainda</p>
                </div>
              ) : convos.map((conv:any)=>{
                const last   = [...conv.messages].sort((a:any,b:any)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime())[0];
                const isOpen = activeConvo?.clientId === conv.clientId;
                return (
                  <div key={conv.clientId} onClick={()=>setActiveConvo(conv)}
                    style={{ padding:'12px 14px', cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,0.04)', background:isOpen?'rgba(139,92,246,0.18)':'transparent', transition:'background 0.15s', display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#4f46e5)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color:'white', fontSize:14, flexShrink:0, fontFamily:"'Syne',sans-serif" }}>
                      {(conv.clientName||'C')[0].toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <span style={{ fontWeight:700, fontSize:13, color:'#e2d9f3' }}>{conv.clientName}</span>
                        {conv.unread>0 && <span style={{ background:'#7c3aed', color:'white', borderRadius:999, padding:'1px 7px', fontSize:10, fontWeight:700 }}>{conv.unread}</span>}
                      </div>
                      <p style={{ fontSize:11, color:'rgba(196,181,253,0.4)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {last?.message||''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat aberto */}
          {activeConvo ? (
            <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
              {/* Header */}
              <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(139,92,246,0.12)', background:'rgba(139,92,246,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#4f46e5)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color:'white', fontSize:13 }}>
                    {activeConvo.clientName[0].toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontWeight:700, fontSize:13, color:'#e2d9f3', margin:0 }}>{activeConvo.clientName}</p>
                    {activeConvo.clientEmail && <p style={{ fontSize:11, color:'rgba(196,181,253,0.4)', margin:0 }}>{activeConvo.clientEmail}</p>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={()=>clearClientHistory(activeConvo.clientId, activeConvo.clientName)}
                    style={{ fontSize:11, padding:'4px 10px', borderRadius:8, background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', color:'rgba(248,113,113,0.6)', cursor:'pointer', fontWeight:700, display:'flex', alignItems:'center', gap:4 }}
                    onMouseEnter={e=>(e.currentTarget as any).style.color='#f87171'}
                    onMouseLeave={e=>(e.currentTarget as any).style.color='rgba(248,113,113,0.6)'}>
                    <Trash2 size={12}/> Apagar
                  </button>
                  <button onClick={()=>setActiveConvo(null)}
                    style={{ fontSize:11, padding:'4px 10px', borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(196,181,253,0.5)', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                    <X size={12}/> Fechar
                  </button>
                </div>
              </div>

              {/* Messages — scrollable */}
              <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:10 }}>
                {activeMessages.length===0 ? (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
                    <p style={{ color:'rgba(196,181,253,0.3)', fontSize:13 }}>Sem mensagens nesta conversa</p>
                  </div>
                ) : activeMessages.map((msg:any, i:number)=>{
                  const isAdmin = msg.direction === 'outgoing';
                  return (
                    <div key={msg.id||i} style={{ display:'flex', justifyContent:isAdmin?'flex-end':'flex-start' }}>
                      <div style={{ maxWidth:'75%' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, justifyContent:isAdmin?'flex-end':'flex-start' }}>
                          <span style={{ fontSize:11, fontWeight:700, color:isAdmin?'#34d399':'#a78bfa' }}>{isAdmin?'Você (Admin)':activeConvo.clientName}</span>
                          <span style={{ fontSize:10, color:'rgba(196,181,253,0.3)' }}>{fmtTime(msg.createdAt)}</span>
                        </div>
                        <div style={{ padding:'9px 13px', borderRadius:16, borderBottomRightRadius:isAdmin?4:16, borderBottomLeftRadius:isAdmin?16:4, background:isAdmin?'linear-gradient(135deg,#7c3aed,#6d28d9)':'rgba(139,92,246,0.12)', border:isAdmin?'none':'1px solid rgba(139,92,246,0.2)' }}>
                          <p style={{ fontSize:13, color:isAdmin?'white':'rgba(226,217,243,0.9)', margin:0, lineHeight:1.5, wordBreak:'break-word' }}>{msg.message}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            </div>
          ) : (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
              <MessageSquare size={40} color="rgba(196,181,253,0.1)" />
              <p style={{ color:'rgba(196,181,253,0.3)', fontSize:14, margin:0 }}>Selecione uma conversa</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}