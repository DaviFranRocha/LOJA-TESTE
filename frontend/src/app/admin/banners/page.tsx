'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Edit, Trash2, Upload, ImageIcon, X, Film } from 'lucide-react';
import toast from 'react-hot-toast';

function BannerPreview({ url, mediaType }: { url: string; mediaType: string }) {
  if (!url) return <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={40} /></div>;
  if (mediaType === 'video') return <video src={url} autoPlay muted loop playsInline className="w-full h-full object-cover" />;
  return <img src={url} alt="" className="w-full h-full object-cover" />;
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]  = useState<any>(null);
  const [form, setForm] = useState({ title: '', subtitle: '', imageUrl: '', linkUrl: '', buttonText: '', sortOrder: '0', status: 'ACTIVE', mediaType: 'image' });
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  const load = () => api.get('/banners/all').then(r => setBanners(r.data.data || [])).catch(() => api.get('/banners').then(r => setBanners(r.data.data || [])));

  const open = (b?: any) => {
    if (b) {
      setEditing(b);
      setForm({ title: b.title, subtitle: b.subtitle||'', imageUrl: b.imageUrl||'', linkUrl: b.linkUrl||'', buttonText: b.buttonText||'', sortOrder: String(b.sortOrder), status: b.status, mediaType: b.mediaType||'image' });
      setMediaPreview(b.imageUrl||'');
    } else {
      setEditing(null);
      setForm({ title: '', subtitle: '', imageUrl: '', linkUrl: '', buttonText: '', sortOrder: '0', status: 'ACTIVE', mediaType: 'image' });
      setMediaPreview('');
    }
    setMediaFile(null);
    setShowForm(true);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    const isVideo = file.type.startsWith('video/');
    const isGif   = file.type === 'image/gif';
    setForm(f => ({ ...f, mediaType: isVideo ? 'video' : isGif ? 'gif' : 'image' }));
    if (isVideo) setMediaPreview(URL.createObjectURL(file));
    else { const reader = new FileReader(); reader.onload = () => setMediaPreview(reader.result as string); reader.readAsDataURL(file); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      if (mediaFile) fd.append('media', mediaFile);
      if (editing) await api.put(`/banners/${editing.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      else         await api.post('/banners', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(editing ? 'Banner atualizado!' : 'Banner criado!');
      setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm('Remover banner?')) return;
    try { await api.delete(`/banners/${id}`); toast.success('Banner removido'); load(); }
    catch { toast.error('Erro'); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900" style={{ fontFamily: "'Syne', sans-serif" }}>Banners</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie os banners da loja — imagem, GIF ou vídeo</p>
        </div>
        <button onClick={() => open()} className="btn-primary flex items-center gap-2 px-4 py-2.5"><Plus size={17} /> Novo Banner</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {banners.map(b => (
          <div key={b.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="relative h-44 bg-gray-100">
              <BannerPreview url={b.imageUrl} mediaType={b.mediaType||'image'} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                <div className="text-white flex-1 min-w-0">
                  <p className="font-bold truncate">{b.title}</p>
                  {b.subtitle && <p className="text-sm opacity-80 truncate">{b.subtitle}</p>}
                </div>
              </div>
              <div className="absolute top-2 left-2 flex gap-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${b.status==='ACTIVE'?'bg-green-500 text-white':'bg-gray-400 text-white'}`}>{b.status}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-purple-600 text-white capitalize">{b.mediaType||'image'}</span>
              </div>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                <p>Ordem: {b.sortOrder}</p>
                {b.linkUrl && <p className="truncate max-w-[200px] text-xs">{b.linkUrl}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => open(b)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"><Edit size={15} /></button>
                <button onClick={() => del(b.id)} className="p-1.5 hover:bg-red-50 text-red-400 rounded-lg transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          </div>
        ))}
        {banners.length === 0 && (
          <div className="col-span-2 text-center py-16 text-gray-400">
            <ImageIcon size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum banner cadastrado</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-lg text-gray-900">{editing ? 'Editar' : 'Novo'} Banner</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><X size={17} /></button>
            </div>

            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Mídia do Banner</label>
                <div className="relative w-full h-40 rounded-xl overflow-hidden border-2 border-dashed cursor-pointer transition-colors"
                  style={{ borderColor: mediaPreview ? '#9333ea' : '#e5e7eb', background: mediaPreview ? '#000' : '#faf5ff' }}
                  onClick={() => fileRef.current?.click()}>
                  {mediaPreview ? (
                    form.mediaType === 'video'
                      ? <video src={mediaPreview} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                      : <img src={mediaPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <Upload size={28} className="mb-2 text-purple-300" />
                      <p className="text-sm font-medium">Clique para enviar</p>
                      <p className="text-xs mt-1">Imagem, GIF ou Vídeo (MP4) · Máx 50MB</p>
                    </div>
                  )}
                  {mediaPreview && (
                    <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white text-sm font-bold">Trocar mídia</p>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*,image/gif,video/mp4,video/webm" className="hidden" onChange={handleFile} />
                <p className="text-xs text-gray-400 mt-1">Ou cole uma URL:</p>
                <input value={form.imageUrl}
                  onChange={e => { setForm(f=>({...f,imageUrl:e.target.value})); if(e.target.value) setMediaPreview(e.target.value); }}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-purple-400"
                  placeholder="https://..." />
              </div>

              {[
                { key: 'title',      label: 'Título *',      required: true,  ph: 'Ex: Novos Produtos' },
                { key: 'subtitle',   label: 'Subtítulo',     required: false, ph: 'Ex: As últimas tendências' },
                { key: 'linkUrl',    label: 'Link do botão', required: false, ph: '/produtos' },
                { key: 'buttonText', label: 'Texto do botão',required: false, ph: 'Ver Ofertas' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{f.label}</label>
                  <input value={(form as any)[f.key]}
                    onChange={e => setForm(x=>({...x,[f.key]:e.target.value}))}
                    required={f.required}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-purple-400"
                    placeholder={f.ph} />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                  <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-purple-400 bg-white">
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ordem</label>
                  <input type="number" value={form.sortOrder} onChange={e=>setForm(f=>({...f,sortOrder:e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-purple-400" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 py-3 disabled:opacity-60">
                  {saving ? 'Salvando...' : (editing ? 'Salvar' : 'Criar Banner')}
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