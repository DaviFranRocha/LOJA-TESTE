'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Edit, Tag, X, Upload, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminCategoriasPage() {
  const [cats, setCats]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<any>(null);
  const [form, setForm]         = useState({ name: '', description: '', imageUrl: '', isActive: true });
  const [imageFile, setImageFile]   = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    api.get('/categories').then(r => setCats(r.data.data)).catch(() => toast.error('Erro ao carregar')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const open = (c?: any) => {
    if (c) {
      setEditing(c);
      setForm({ name: c.name, description: c.description || '', imageUrl: c.imageUrl || '', isActive: c.isActive });
      setImagePreview(c.imageUrl || '');
    } else {
      setEditing(null);
      setForm({ name: '', description: '', imageUrl: '', isActive: true });
      setImagePreview('');
    }
    setImageFile(null);
    setShowForm(true);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('isActive', String(form.isActive));
      if (imageFile) {
        fd.append('image', imageFile);
      } else if (form.imageUrl) {
        fd.append('imageUrl', form.imageUrl);
      }

      if (editing) {
        await api.put(`/categories/${editing.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/categories', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      toast.success(editing ? 'Categoria atualizada!' : 'Categoria criada!');
      setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Remover a categoria "${name}"? Os produtos não serão deletados.`)) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Categoria removida');
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erro'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#111', fontFamily: "'Syne', sans-serif" }}>Categorias</h1>
          <p className="text-sm text-gray-500 mt-1">Organize seus produtos em categorias</p>
        </div>
        <button onClick={() => open()} className="btn-primary flex items-center gap-2 px-4 py-2.5">
          <Plus size={17} /> Nova Categoria
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_,i) => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cats.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-purple-50 border border-purple-100">
                {c.imageUrl ? (
                  <img
                    src={c.imageUrl}
                    alt={c.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <Tag size={22} className="text-purple-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900">{c.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {c._count?.products || 0} produtos ·{' '}
                  <span className={c.isActive ? 'text-green-600' : 'text-red-400'}>
                    {c.isActive ? 'Ativa' : 'Inativa'}
                  </span>
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => open(c)} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors">
                  <Edit size={14} />
                </button>
                <button onClick={() => remove(c.id, c.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {cats.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <Tag size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma categoria cadastrada</p>
              <p className="text-sm mt-1">Crie sua primeira categoria clicando em "Nova Categoria"</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-lg text-gray-900">{editing ? 'Editar' : 'Nova'} Categoria</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={17} />
              </button>
            </div>

            <form onSubmit={save} className="space-y-4">
              {/* Image upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Imagem da Categoria</label>
                <div className="flex gap-3 items-start">
                  <div
                    className="w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 border-2 border-dashed cursor-pointer transition-colors"
                    style={{ borderColor: imagePreview ? '#9333ea' : '#e5e7eb', background: imagePreview ? 'white' : '#faf5ff' }}
                    onClick={() => fileRef.current?.click()}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Upload size={20} className="text-purple-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="text-sm text-purple-600 font-medium hover:underline block mb-1">
                      {imagePreview ? 'Trocar imagem' : 'Selecionar imagem'}
                    </button>
                    <p className="text-xs text-gray-400">JPG, PNG ou WEBP · Máx 5MB</p>
                    <p className="text-xs text-gray-400 mt-1">Ou cole uma URL abaixo:</p>
                    <input
                      value={form.imageUrl}
                      onChange={e => { setForm(f => ({...f, imageUrl: e.target.value})); if (e.target.value) setImagePreview(e.target.value); }}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-purple-400"
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome *</label>
                <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400"
                  placeholder="Ex: Cursos Online" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descrição</label>
                <input value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400"
                  placeholder="Descrição breve" />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f=>({...f,isActive:e.target.checked}))}
                  className="w-4 h-4 rounded accent-purple-600" />
                <span className="text-sm font-medium text-gray-700">Categoria ativa</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 py-3 disabled:opacity-60">
                  {saving ? 'Salvando...' : (editing ? 'Salvar Alterações' : 'Criar Categoria')}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
