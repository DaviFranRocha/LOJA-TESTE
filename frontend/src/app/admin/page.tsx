'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  TrendingUp, TrendingDown, ShoppingBag, Users, Package,
  DollarSign, AlertTriangle, Clock, Circle, Trash2,
  Activity, UserCheck, UserX, RefreshCw, X
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// ── Tipos ──────────────────────────────────────────────────────
interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  createdAt: string;
  user?: { name: string; email: string; avatarUrl?: string };
}

const ACTION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  LOGIN:           { label: 'Login',             color: '#3b82f6', bg: '#eff6ff' },
  LOGOUT:          { label: 'Logout',            color: '#6b7280', bg: '#f9fafb' },
  REGISTER:        { label: 'Cadastro',          color: '#8b5cf6', bg: '#f5f3ff' },
  CREATE_ORDER:    { label: 'Novo Pedido',       color: '#f59e0b', bg: '#fffbeb' },
  CREATE_PAYMENT:  { label: 'Pagamento PIX',     color: '#10b981', bg: '#f0fdf4' },
  CONFIRM_PAYMENT: { label: 'Pag. Confirmado',  color: '#059669', bg: '#ecfdf5' },
  CREATE_PRODUCT:  { label: 'Produto Criado',   color: '#6366f1', bg: '#eef2ff' },
  UPDATE_PRODUCT:  { label: 'Produto Editado',  color: '#8b5cf6', bg: '#f5f3ff' },
  DELETE_PRODUCT:  { label: 'Produto Deletado', color: '#ef4444', bg: '#fef2f2' },
  UPDATE_PROFILE:  { label: 'Perfil Atualizado',color: '#64748b', bg: '#f8fafc' },
};

export default function AdminDashboard() {
  const [data, setData]           = useState<any>(null);
  const [logs, setLogs]           = useState<ActivityLog[]>([]);
  const [onlineUsers, setOnline]  = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [deleting, setDeleting]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [dashRes, logsRes, onlineRes] = await Promise.allSettled([
        api.get('/admin/dashboard'),
        api.get('/admin/logs?limit=30'),
        api.get('/admin/online-users'),
      ]);
      if (dashRes.status === 'fulfilled')  setData(dashRes.value.data.data);
      if (logsRes.status === 'fulfilled')  setLogs(logsRes.value.data.data || []);
      if (onlineRes.status === 'fulfilled') setOnline(onlineRes.value.data.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Refresh online users every 30s
    const t = setInterval(() => {
      api.get('/admin/online-users').then(r => setOnline(r.data.data || [])).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const deleteLog = async (id: string) => {
    setDeleting(id);
    try {
      await api.delete(`/admin/logs/${id}`);
      setLogs(l => l.filter(x => x.id !== id));
    } catch {}
    setDeleting(null);
  };

  const clearAllLogs = async () => {
    if (!confirm('Limpar todos os logs? Esta ação não pode ser desfeita.')) return;
    try {
      await api.delete('/admin/logs');
      setLogs([]);
    } catch {}
  };

  if (loading) return (
    <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => <div key={i} className="bg-white rounded-xl h-28 animate-pulse" />)}
    </div>
  );

  const s = data?.stats || {};

  const statCards = [
    { label: 'Receita Total',     value: `R$ ${Number(s.totalRevenue||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`, icon: <DollarSign size={22}/>, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Receita do Mês',    value: `R$ ${Number(s.monthRevenue||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`, icon: s.revenueGrowth>=0?<TrendingUp size={22}/>:<TrendingDown size={22}/>, color: s.revenueGrowth>=0?'text-green-600':'text-red-600', bg:'bg-blue-50', sub:`${s.revenueGrowth>=0?'+':''}${s.revenueGrowth||0}% vs mês ant.` },
    { label: 'Pedidos Pendentes', value: s.pendingOrders||0, icon:<Clock size={22}/>, color:'text-orange-600', bg:'bg-orange-50' },
    { label: 'Total de Pedidos',  value: s.totalOrders||0,  icon:<ShoppingBag size={22}/>, color:'text-blue-600', bg:'bg-blue-50' },
    { label: 'Total de Clientes', value: s.totalUsers||0,   icon:<Users size={22}/>, color:'text-purple-600', bg:'bg-purple-50', sub:`+${s.newUsersToday||0} hoje` },
    { label: 'Produtos Ativos',   value: s.totalProducts||0,icon:<Package size={22}/>, color:'text-indigo-600', bg:'bg-indigo-50' },
    { label: 'Estoque Baixo',     value: s.lowStockProducts||0,icon:<AlertTriangle size={22}/>, color:'text-red-600', bg:'bg-red-50' },
    { label: 'Online Agora',      value: onlineUsers.length, icon:<Activity size={22}/>, color:'text-emerald-600', bg:'bg-emerald-50', sub:'Últimos 5 min' },
  ];

  const STATUS_LABELS: Record<string,string> = {
    PENDING:'Pendente', PAYMENT_PENDING:'Ag. Pag.', PAID:'Pago',
    PROCESSING:'Processando', SHIPPED:'Enviado', DELIVERED:'Entregue', CANCELLED:'Cancelado',
  };

  const onlineCount  = onlineUsers.filter(u => u.isOnline).length;
  const offlineCount = onlineUsers.filter(u => !u.isOnline).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-500 hover:text-purple-600 transition-colors">
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((c, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{c.label}</p>
              <span className={`${c.bg} ${c.color} p-2 rounded-lg`}>{c.icon}</span>
            </div>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            {c.sub && <p className="text-xs text-gray-400 mt-1">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Online / Offline Users */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Activity size={18} className="text-purple-600" />
            Usuários Online
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
              <Circle size={10} style={{ fill: '#10b981', color: '#10b981' }} />
              {onlineCount} online
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-gray-400">
              <Circle size={10} style={{ fill: '#9ca3af', color: '#9ca3af' }} />
              {offlineCount} offline
            </span>
          </div>
        </div>

        {onlineUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Nenhum usuário ativo recentemente</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {onlineUsers.slice(0, 10).map(u => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-xl overflow-hidden bg-purple-100 flex items-center justify-center">
                    {u.avatarUrl
                      ? <img src={u.avatarUrl} alt={u.name} style={{ width:'100%',height:'100%',objectFit:'cover' }} />
                      : <span className="text-purple-700 font-black text-sm">{u.name?.[0]?.toUpperCase()}</span>
                    }
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                    style={{ background: u.isOnline ? '#10b981' : '#9ca3af' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${u.isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                    {u.isOnline ? 'Online' : u.lastSeen ? `${u.lastSeen}` : 'Offline'}
                  </span>
                  <p className="text-xs text-gray-300 mt-0.5">{u.role}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data?.revenueByDay?.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-4">Receita — Últimos 30 dias</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.revenueByDay}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => `R$ ${Number(v).toFixed(2)}`} />
                <Line type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {data?.ordersByStatus?.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-4">Pedidos por Status</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.ordersByStatus}>
                <XAxis dataKey="status" tick={{ fontSize: 10 }} tickFormatter={s => STATUS_LABELS[s]||s} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={l => STATUS_LABELS[l]||l} />
                <Bar dataKey="count" fill="#7c3aed" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Activity Logs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Activity size={18} className="text-purple-600" />
            Log de Atividades
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">{logs.length}</span>
          </h2>
          {logs.length > 0 && (
            <button onClick={clearAllLogs}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all">
              <Trash2 size={13} /> Limpar todos
            </button>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Nenhuma atividade registrada</div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
            {logs.map(log => {
              const action = ACTION_LABELS[log.action] || { label: log.action, color: '#6b7280', bg: '#f9fafb' };
              const time   = new Date(log.createdAt);
              const timeStr = time.toLocaleString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
              return (
                <div key={log.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 group transition-colors">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                    style={{ background: action.bg }}>
                    {log.user?.avatarUrl
                      ? <img src={log.user.avatarUrl} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }} />
                      : <span style={{ color: action.color, fontWeight:'bold', fontSize:13 }}>
                          {log.user?.name?.[0]?.toUpperCase() || '?'}
                        </span>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: action.bg, color: action.color }}>
                        {action.label}
                      </span>
                      <span className="text-sm text-gray-700 font-medium truncate">
                        {log.user?.name || 'Sistema'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {log.user?.email} · {log.entity} {log.entityId ? `#${log.entityId.slice(-6)}` : ''}
                    </p>
                  </div>

                  {/* Time + Delete */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-300">{timeStr}</span>
                    <button
                      onClick={() => deleteLog(log.id)}
                      disabled={deleting === log.id}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-300 hover:text-red-500 transition-all">
                      {deleting === log.id
                        ? <RefreshCw size={12} className="animate-spin" />
                        : <X size={12} />
                      }
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Orders */}
      {data?.recentOrders?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">Pedidos Recentes</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recentOrders.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800 font-mono">{o.orderNumber}</p>
                  <p className="text-xs text-gray-400">{o.user?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-purple-600">R$ {Number(o.total).toFixed(2)}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
                    {STATUS_LABELS[o.status] || o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}