'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, UserCheck, UserX, Shield, Star, User, Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/store';

// ── Hierarquia (sem DIRETOR) ──────────────────────────────────
const ROLE_LEVEL: Record<string, number> = {
  CUSTOMER: 0, GERENTE: 1, ADMIN: 2, SUPER_ADMIN: 3,
};

const ROLES = [
  { value: 'CUSTOMER',    label: 'Cliente',     color: '#9ca3af', bg: 'rgba(156,163,175,0.1)',  icon: <User size={12} />,   desc: 'Apenas comprar' },
  { value: 'GERENTE',     label: 'Gerente',     color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   icon: <Star size={12} />,   desc: 'Pedidos e estoque' },
  { value: 'ADMIN',       label: 'Admin',       color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  icon: <Shield size={12} />, desc: 'Administrador' },
  { value: 'SUPER_ADMIN', label: 'Super Admin', color: '#f87171', bg: 'rgba(248,113,113,0.1)',  icon: <Shield size={12} />, desc: 'Controle total' },
];

const ROLE_PERMS: Record<string, string[]> = {
  CUSTOMER:    ['Comprar produtos', 'Ver pedidos próprios'],
  GERENTE:     ['Ver pedidos', 'Atualizar status de pedidos', 'Controlar estoque', 'Visualizar produtos'],
  ADMIN:       ['Gerenciar produtos', 'Gerenciar categorias', 'Gerenciar pedidos', 'Gerenciar cupons', 'Gerenciar banners', 'Ver relatórios', 'Gerenciar clientes'],
  SUPER_ADMIN: ['Tudo do Admin', 'Gerenciar usuários', 'Desativar contas', 'Ver logs', 'Configurações avançadas', 'Confirmar pagamentos'],

};

export default function AdminUsersPage() {
  const currentUser = useAuthStore(s => s.user);
  const [users, setUsers]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editingRole, setEditingRole] = useState<any>(null);
  const [newRole, setNewRole]     = useState('');
  const [deleting, setDeleting]   = useState<string | null>(null);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const load = async (q = '', r = '') => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: '100' });
      if (q) p.set('search', q);
      if (r) p.set('role', r);
      const { data } = await api.get(`/admin/users?${p}`);
      setUsers(data.data);
    } catch { toast.error('Erro ao carregar usuários'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (id: string) => {
    try {
      const { data } = await api.patch(`/admin/users/${id}/status`, {});
      setUsers(u => u.map(x => x.id === id ? { ...x, isActive: data.data.isActive } : x));
      toast.success(data.data.isActive ? 'Usuário ativado' : 'Usuário desativado');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erro ao alterar status'); }
  };

  const changeRole = async () => {
    if (!editingRole || !newRole) return;
    try {
      await api.patch(`/admin/users/${editingRole.id}/role`, { role: newRole });
      setUsers(u => u.map(x => x.id === editingRole.id ? { ...x, role: newRole } : x));
      toast.success('Cargo atualizado!');
      setEditingRole(null);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erro ao alterar cargo'); }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Tem certeza que quer remover esta conta? Esta ação é irreversível.')) return;
    setDeleting(id);
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(u => u.filter(x => x.id !== id));
      toast.success('Conta removida');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erro ao remover'); }
    finally { setDeleting(null); }
  };

  const canManage = (targetRole: string) => {
    if (!currentUser) return false;
    return currentUser.role === 'SUPER_ADMIN';
  };

  const availableRoles = isSuperAdmin ? ROLES : [];

  const counts = ROLES.reduce((acc, r) => {
    acc[r.value] = users.filter(u => u.role === r.value).length;
    return acc;
  }, {} as Record<string, number>);

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>
          Usuários
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {ROLES.map(r => (
          <div key={r.value}
            className="card cursor-pointer transition-all"
            style={{ borderColor: roleFilter === r.value ? r.color + '50' : 'var(--border)', background: roleFilter === r.value ? r.bg : 'var(--surface)' }}
            onClick={() => setRoleFilter(roleFilter === r.value ? '' : r.value)}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color: r.color }}>{r.icon}</span>
              <span className="text-xs font-bold" style={{ color: r.color, fontFamily: "'Syne', sans-serif" }}>{r.label}</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.desc}</p>
            <p className="text-2xl font-black mt-2" style={{ color: r.color, fontFamily: "'Syne', sans-serif" }}>
              {counts[r.value] || 0}
            </p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="input pl-10" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="input w-44"
          style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
          <option value="">Todos os cargos</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button onClick={() => load(search, roleFilter)} className="btn-primary px-5">Buscar</button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                {['Usuário', 'Cargo', 'Permissões', 'Pedidos', 'Último Login', 'Status', 'Ações'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)', fontFamily: "'Syne', sans-serif" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="skeleton h-4 rounded w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : filtered.map(u => {
                const role = ROLES.find(r => r.value === u.role) || ROLES[0];
                const perms = ROLE_PERMS[u.role] || [];
                const isMe = u.id === currentUser?.id;

                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}
                    className="transition-colors hover:bg-[rgba(139,92,246,0.03)]">
                    {/* Usuário */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0"
                          style={{ border: '1.5px solid var(--border-bright)' }}>
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={u.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement!.style.background = 'var(--grad-neon)'); }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-xs font-black"
                              style={{ background: 'var(--grad-neon)', fontFamily: "'Syne', sans-serif" }}>
                              {u.name?.[0]?.toUpperCase() || '?'}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                            {u.name} {isMe && <span className="text-xs" style={{ color: 'var(--violet-400)' }}>(você)</span>}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Cargo */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{ background: role.bg, color: role.color, border: `1px solid ${role.color}30`, fontFamily: "'Syne', sans-serif" }}>
                        {role.icon} {role.label}
                      </span>
                    </td>

                    {/* Permissões */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {perms.slice(0, 2).map(p => (
                          <span key={p} className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--surface-3)', color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                            {p}
                          </span>
                        ))}
                        {perms.length > 2 && (
                          <span className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--violet-400)', fontSize: '0.65rem' }}>
                            +{perms.length - 2}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Pedidos */}
                    <td className="px-4 py-3">
                      <span className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {u._count?.orders || 0}
                      </span>
                    </td>

                    {/* Último login */}
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('pt-BR') : '—'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full"
                        style={{
                          background: u.isActive ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                          color: u.isActive ? '#34d399' : '#f87171',
                          border: `1px solid ${u.isActive ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
                        }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: u.isActive ? '#34d399' : '#f87171' }} />
                        {u.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3">
                      {!isMe && canManage(u.role) ? (
                        <div className="flex items-center gap-2">
                          {/* Alterar cargo */}
                          <button
                            onClick={() => { setEditingRole(u); setNewRole(u.role); }}
                            className="p-1.5 rounded-lg transition-all text-xs flex items-center gap-1"
                            style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--violet-400)', border: '1px solid rgba(139,92,246,0.2)' }}
                            title="Alterar cargo">
                            <Edit2 size={12} />
                          </button>

                          {/* Ativar/Desativar */}
                          <button
                            onClick={() => toggle(u.id)}
                            className="p-1.5 rounded-lg transition-all"
                            style={{
                              background: u.isActive ? 'rgba(248,113,113,0.1)' : 'rgba(52,211,153,0.1)',
                              color: u.isActive ? '#f87171' : '#34d399',
                              border: `1px solid ${u.isActive ? 'rgba(248,113,113,0.2)' : 'rgba(52,211,153,0.2)'}`,
                            }}
                            title={u.isActive ? 'Desativar' : 'Ativar'}>
                            {u.isActive ? <UserX size={12} /> : <UserCheck size={12} />}
                          </button>

                          {/* Deletar — apenas SUPER_ADMIN */}
                          {isSuperAdmin && (
                            <button
                              onClick={() => deleteUser(u.id)}
                              disabled={deleting === u.id}
                              className="p-1.5 rounded-lg transition-all"
                              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                              title="Remover conta">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-ghost)' }}>
                          {isMe ? '(você)' : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal alterar cargo */}
      {editingRole && (
        <div className="modal-overlay" onClick={() => setEditingRole(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black mb-1" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>
              Alterar Cargo
            </h3>
            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
              Usuário: <strong style={{ color: 'var(--text-primary)' }}>{editingRole.name}</strong>
            </p>

            <div className="space-y-2 mb-6">
              {availableRoles.map(r => (
                <div key={r.value}
                  onClick={() => setNewRole(r.value)}
                  className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: newRole === r.value ? r.bg : 'var(--surface-2)',
                    border: `1.5px solid ${newRole === r.value ? r.color + '50' : 'var(--border)'}`,
                  }}>
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ borderColor: newRole === r.value ? r.color : 'var(--text-ghost)', background: newRole === r.value ? r.color : 'transparent' }}>
                    {newRole === r.value && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: r.color, fontFamily: "'Syne', sans-serif" }}>
                        {r.icon} {r.label}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {ROLE_PERMS[r.value]?.slice(0, 2).join(' · ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={changeRole} className="btn-primary flex-1 py-3">Confirmar</button>
              <button onClick={() => setEditingRole(null)} className="btn-secondary flex-1 py-3">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
