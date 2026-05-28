'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminConfigPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [grouped, setGrouped] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [edits, setEdits]     = useState<Record<string, string>>({});

  useEffect(() => {
    api.get('/admin/config').then(r => {
      setConfigs(r.data.data.configs);
      setGrouped(r.data.data.grouped);
      const e: Record<string, string> = {};
      r.data.data.configs.forEach((c: any) => { e[c.key] = c.value; });
      setEdits(e);
    }).finally(() => setLoading(false));
  }, []);

  const save = async (key: string) => {
    try {
      await api.post('/admin/config', { key, value: edits[key] });
      toast.success('Configuração salva!');
    } catch { toast.error('Erro ao salvar'); }
  };

  const GROUP_LABELS: Record<string, string> = {
    general: '🏪 Geral', payment: '💳 Pagamento', shipping: '🚚 Frete',
  };

  if (loading) return <div className="p-6"><div className="bg-gray-100 rounded-xl h-64 animate-pulse" /></div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Configurações da Loja</h1>
      {Object.keys(grouped).map(group => (
        <div key={group} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-lg mb-5">{GROUP_LABELS[group] || group}</h2>
          <div className="space-y-4">
            {configs.filter(c => c.group === group).map(c => (
              <div key={c.key} className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{c.label || c.key}</label>
                  <input value={edits[c.key] || ''} onChange={e => setEdits(x => ({ ...x, [c.key]: e.target.value }))} className="input text-sm" />
                </div>
                <button onClick={() => save(c.key)} className="flex-shrink-0 mt-5 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors" title="Salvar">
                  <Save size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
