'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, Upload, X, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  name: '', price: '', comparePrice: '', stock: '', categoryId: '',
  status: 'ACTIVE', description: '', shortDesc: '', sku: '',
  downloadUrl: '', accessDays: '5', isFeatured: false, isNew: false,
};

export default function AdminProductsPage() {
  const [products, setProducts]   = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<any>(null);
  const [form, setForm]           = useState<any>(EMPTY_FORM);
  const [imageUrl, setImageUrl]   = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImg, setUploadingImg] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [saving, setSaving]       = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
    api.get('/categories?all=true').then(r => setCategories(r.data.data)).catch(() => {});
  }, []);

  const load = async (q = '') => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: '50' });
      if (q) p.set('search', q);
      const { data } = await api.get(`/products?${p}`);
      setProducts(data.data);
    } finally { setLoading(false); }
  };

  const openForm = (product?: any) => {
    if (product) {
      setEditing(product);
      setForm({
        name: product.name, price: String(product.price),
        comparePrice: product.comparePrice ? String(product.comparePrice) : '',
        stock: String(product.stock), categoryId: product.categoryId || '',
        status: product.status, description: product.description || '',
        shortDesc: product.shortDesc || '', sku: product.sku || '',
        downloadUrl: product.downloadUrl || '', accessDays: String(product.accessDays || 5),
        isFeatured: product.isFeatured, isNew: product.isNew,
      });
      const img = product.images?.[0]?.url || '';
      setImageUrl(img); setImagePreview(img);
    } else {
      setEditing(null);
      setForm(EMPTY_FORM);
      setImageUrl(''); setImagePreview('');
    }
    setShowForm(true);
  };

  // Handle file selection — convert to base64 directly in browser
  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo 8MB.'); return; }

    setUploadingImg(true);
    try {
      // Convert to base64 in the browser
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Try server upload first
      try {
        const formData = new FormData();
        formData.append('image', file);
        const { data } = await api.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 15000,
        });
        setImageUrl(data.data.url);
        setImagePreview(data.data.url);
        toast.success('Imagem carregada!');
      } catch {
        // Fallback: use base64 directly
        setImageUrl(base64);
        setImagePreview(base64);
        toast.success('Imagem carregada! (modo local)');
      }
    } catch { toast.error('Erro ao carregar imagem'); }
    finally { setUploadingImg(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const handleImageUrl = (url: string) => {
    setImageUrl(url);
    if (url) setImagePreview(url);
    else setImagePreview('');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        name: form.name, description: form.description, shortDesc: form.shortDesc,
        price: parseFloat(form.price),
        comparePrice: form.comparePrice ? parseFloat(form.comparePrice) : null,
        stock: parseInt(form.stock) || 0,
        categoryId: form.categoryId || null,
        status: form.status, isFeatured: form.isFeatured, isNew: form.isNew,
      };
      if (form.sku && form.sku.trim()) payload.sku = form.sku.trim();
      if (imageUrl) payload.images = [{ url: imageUrl, alt: form.name }];
      if (form.downloadUrl) payload.downloadUrl = form.downloadUrl;
      if (form.accessDays)  payload.accessDays  = parseInt(form.accessDays) || 5;

      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
        // Update image separately if changed
        if (imageUrl && imageUrl !== editing.images?.[0]?.url) {
          // image is included in the update payload above
        }
        toast.success('Produto atualizado!');
      } else {
        await api.post('/products', payload);
        toast.success('Produto criado!');
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar produto');
    } finally { setSaving(false); }
  };

  const deleteProduct = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/products/${confirmDelete.id}`);
      toast.success('Produto removido!');
      setConfirmDelete(null);
      load();
    } catch { toast.error('Erro ao remover produto'); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900">Produtos</h1>
        <button onClick={() => openForm()} className="btn-primary flex items-center gap-2 px-4 py-2.5">
          <Plus size={17} /> Novo Produto
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load(search)}
            placeholder="Buscar produtos..." className="input pl-9 text-sm" />
        </div>
        <button onClick={() => load(search)} className="btn-secondary text-sm px-4">Buscar</button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="skeleton rounded-xl h-14" />)}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Produto</th>
                <th className="px-5 py-3.5">SKU</th>
                <th className="px-5 py-3.5">Preço</th>
                <th className="px-5 py-3.5">Estoque</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                        {p.images?.[0]?.url
                          ? <img src={p.images[0].url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          : <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={16} /></div>}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 line-clamp-1">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.category?.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-purple-600 font-bold">{p.sku || '—'}</td>
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-purple-700">R$ {Number(p.price).toFixed(2)}</p>
                    {p.comparePrice && <p className="text-xs text-gray-400 line-through">R$ {Number(p.comparePrice).toFixed(2)}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold flex items-center gap-1 ${p.stock <= 5 ? 'text-red-500' : 'text-gray-700'}`}>
                      {p.stock <= 5 && <AlertTriangle size={11} />}{p.stock}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`badge text-xs px-2.5 py-1 rounded-full ${p.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>
                      {p.status === 'ACTIVE' ? 'Ativo' : p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1.5">
                      <button onClick={() => openForm(p)} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors"><Edit size={14} /></button>
                      <button onClick={() => setConfirmDelete(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum produto encontrado</p>
            </div>
          )}
        </div>
      )}

      {/* ── PRODUCT FORM MODAL ──────────────────────── */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal-box max-w-2xl w-full overflow-y-auto" style={{ maxHeight: '92vh' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-gray-900">{editing ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>

            <form onSubmit={save} className="space-y-5">
              {/* Image */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Imagem do Produto</label>
                <div className="flex gap-3 items-start">
                  {/* Preview box */}
                  <div className="relative w-28 h-28 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center border-2 border-dashed transition-colors"
                    style={{ borderColor: imagePreview ? '#9333ea' : '#e5e7eb', background: imagePreview ? 'white' : '#faf5ff' }}>
                    {uploadingImg ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-gray-400">Enviando...</span>
                      </div>
                    ) : imagePreview ? (
                      <>
                        <Image src={imagePreview} alt="Preview" fill className="object-cover" unoptimized />
                        <button type="button" onClick={() => { setImagePreview(''); setImageUrl(''); }}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors">
                          <X size={11} />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-purple-300">
                        <ImageIcon size={24} />
                        <span className="text-xs">Sem imagem</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleImageFile} />
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadingImg}
                      className="btn-primary w-full text-sm py-2.5 disabled:opacity-50">
                      <Upload size={15} /> {uploadingImg ? 'Enviando...' : 'Selecionar Imagem'}
                    </button>
                    <div className="relative">
                      <input placeholder="Ou cole a URL da imagem aqui"
                        value={imageUrl.startsWith('data:') ? '' : imageUrl}
                        onChange={e => handleImageUrl(e.target.value)}
                        className="input text-sm py-2" />
                    </div>
                    <p className="text-xs text-gray-400">JPG, PNG ou WEBP · Máx 8MB</p>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome do Produto *</label>
                <input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))}
                  required className="input" placeholder="Ex: Curso de Marketing Digital" />
              </div>

              {/* Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Preço (R$) *</label>
                  <input type="number" step="0.01" min="0" required value={form.price}
                    onChange={e => setForm((f: any) => ({ ...f, price: e.target.value }))} className="input" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Preço Original <span className="font-normal text-gray-400">(desconto)</span></label>
                  <input type="number" step="0.01" min="0" value={form.comparePrice}
                    onChange={e => setForm((f: any) => ({ ...f, comparePrice: e.target.value }))} className="input" placeholder="0.00" />
                </div>
              </div>

              {/* Stock / Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estoque *</label>
                  <input type="number" min="0" required value={form.stock}
                    onChange={e => setForm((f: any) => ({ ...f, stock: e.target.value }))} className="input" placeholder="99" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Categoria</label>
                  <select value={form.categoryId} onChange={e => setForm((f: any) => ({ ...f, categoryId: e.target.value }))} className="input">
                    <option value="">Sem categoria</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                <select value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))} className="input">
                  <option value="ACTIVE">Ativo — aparece na loja</option>
                  <option value="INACTIVE">Inativo — oculto na loja</option>
                  <option value="OUT_OF_STOCK">Sem Estoque</option>
                </select>
              </div>

              {/* Descriptions */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descrição Curta</label>
                <input value={form.shortDesc} onChange={e => setForm((f: any) => ({ ...f, shortDesc: e.target.value }))}
                  className="input" placeholder="Uma frase resumindo o produto" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descrição Completa</label>
                <textarea rows={4} value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
                  className="input resize-none" placeholder="Descreva o produto em detalhes..." />
              </div>

              {/* Download / Acesso */}
              <div className="p-4 rounded-xl space-y-3" style={{ background: '#f5f0ff', border: '1px solid #d8b4fe' }}>
                <p className="text-sm font-black text-purple-700" style={{ fontFamily: "'Syne', sans-serif" }}>
                  📥 Acesso Digital
                </p>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    🔗 Link de Download / Acesso
                  </label>
                  <input
                    value={form.downloadUrl || ''}
                    onChange={e => setForm((f: any) => ({ ...f, downloadUrl: e.target.value }))}
                    className="w-full border border-purple-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500 text-gray-900 bg-white"
                    placeholder="https://drive.google.com/... ou outro link de acesso"
                  />
                  <p className="text-xs text-gray-500 mt-1">Cole o link do Google Drive, Mega, Dropbox, etc. Será liberado após o pagamento.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    ⏳ Dias de Acesso
                  </label>
                  <input
                    type="number" min="1" max="365"
                    value={form.accessDays || '5'}
                    onChange={e => setForm((f: any) => ({ ...f, accessDays: e.target.value }))}
                    className="w-32 border border-purple-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500 text-gray-900 bg-white"
                    placeholder="5"
                  />
                  <p className="text-xs text-gray-500 mt-1">Quantos dias o cliente tem acesso após pagar (padrão: 5 dias).</p>
                </div>
              </div>

              {/* Flags */}
              <div className="flex gap-6 p-4 bg-gray-50 rounded-xl">
                {[
                  { key: 'isFeatured', label: '⭐ Exibir na Home (Destaque)' },
                  { key: 'isNew',      label: '🆕 Marcar como Novo' },
                ].map(c => (
                  <label key={c.key} className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
                    <input type="checkbox" checked={form[c.key]} onChange={e => setForm((f: any) => ({ ...f, [c.key]: e.target.checked }))}
                      className="w-4 h-4 accent-purple-600 rounded" />
                    <span className="font-medium text-gray-700">{c.label}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 py-3.5 font-black disabled:opacity-60">
                  {saving ? 'Salvando...' : editing ? '✓ Atualizar Produto' : '+ Criar Produto'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 py-3.5">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE ───────────────────────────── */}
      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={26} className="text-red-500" />
            </div>
            <h3 className="text-xl font-black text-gray-900 text-center mb-2">Remover Produto?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Tem certeza que deseja remover <strong>"{confirmDelete.name}"</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={deleteProduct} className="btn-danger flex-1 py-3 font-black">Sim, remover</button>
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1 py-3">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}