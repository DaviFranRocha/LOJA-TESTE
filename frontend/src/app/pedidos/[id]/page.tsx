'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import Navbar from '@/components/store/Navbar';
import Footer from '@/components/store/Footer';
import toast from 'react-hot-toast';
import { Package, MapPin, CreditCard, CheckCircle, Clock, Truck, XCircle } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  PENDING:         { label: 'Pendente',          color: 'text-yellow-600', icon: Clock },
  PAYMENT_PENDING: { label: 'Aguard. Pagamento', color: 'text-orange-600', icon: CreditCard },
  PAID:            { label: 'Pago',              color: 'text-blue-600',   icon: CheckCircle },
  PROCESSING:      { label: 'Processando',       color: 'text-blue-600',   icon: Package },
  SHIPPED:         { label: 'Enviado',           color: 'text-purple-600', icon: Truck },
  DELIVERED:       { label: 'Entregue',          color: 'text-green-600',  icon: CheckCircle },
  CANCELLED:       { label: 'Cancelado',         color: 'text-red-600',    icon: XCircle },
};

export default function OrderDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const user     = useAuthStore(s => s.user);
  const router   = useRouter();
  const [order, setOrder]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    api.get(`/orders/${id}`).then(r => setOrder(r.data.data)).finally(() => setLoading(false));
  }, [user, id]);

  const cancelOrder = async () => {
    if (!confirm('Cancelar este pedido?')) return;
    try {
      await api.post(`/orders/${id}/cancel`, { reason: 'Cancelado pelo cliente' });
      toast.success('Pedido cancelado');
      setOrder((o: any) => ({ ...o, status: 'CANCELLED' }));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Não foi possível cancelar');
    }
  };

  if (loading) return <><Navbar /><div className="max-w-4xl mx-auto px-4 py-12"><div className="bg-gray-100 rounded-xl h-64 animate-pulse" /></div><Footer /></>;
  if (!order)  return <><Navbar /><div className="max-w-4xl mx-auto px-4 py-16 text-center"><p className="text-gray-500">Pedido não encontrado</p><Link href="/pedidos" className="btn-primary mt-4 inline-block">Voltar</Link></div><Footer /></>;

  const st = STATUS_LABELS[order.status] || { label: order.status, color: 'text-gray-600', icon: Package };
  const Icon = st.icon;

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/pedidos" className="text-sm text-blue-600 hover:underline">← Meus Pedidos</Link>
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <span className={`flex items-center gap-1 font-semibold ${st.color}`}><Icon size={18} />{st.label}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Items */}
          <div className="md:col-span-2 space-y-4">
            <div className="card">
              <h2 className="font-bold mb-4">Itens do Pedido</h2>
              <div className="space-y-4">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex gap-4 items-center">
                    <div className="relative w-16 h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                      {item.productImg
                        ? <Image src={item.productImg} alt={item.productName} fill className="object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">📦</div>}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.productName}</p>
                      <p className="text-xs text-gray-500">Qtd: {item.quantity} · Unit: R$ {Number(item.unitPrice).toFixed(2)}</p>
                    </div>
                    <p className="font-semibold text-sm">R$ {Number(item.totalPrice).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Status History */}
            {order.statusHistory?.length > 0 && (
              <div className="card">
                <h2 className="font-bold mb-4">Histórico do Pedido</h2>
                <div className="space-y-3">
                  {order.statusHistory.map((h: any, i: number) => (
                    <div key={h.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full mt-1 ${i === 0 ? 'bg-blue-600' : 'bg-gray-300'}`} />
                        {i < order.statusHistory.length - 1 && <div className="w-0.5 bg-gray-200 flex-1 my-1" />}
                      </div>
                      <div className="pb-3">
                        <p className="font-medium text-sm">{STATUS_LABELS[h.status]?.label || h.status}</p>
                        <p className="text-xs text-gray-400">{h.comment} · {new Date(h.createdAt).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tracking */}
            {order.trackingCode && (
              <div className="card">
                <h2 className="font-bold mb-2 flex items-center gap-2"><Truck size={18} className="text-blue-600" /> Rastreio</h2>
                <p className="text-sm">Código: <strong>{order.trackingCode}</strong></p>
                {order.trackingUrl && <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">Rastrear pacote →</a>}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Summary */}
            <div className="card">
              <h2 className="font-bold mb-4">Resumo</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>R$ {Number(order.subtotal).toFixed(2)}</span></div>
                {Number(order.discount) > 0 && <div className="flex justify-between text-green-600"><span>Desconto</span><span>-R$ {Number(order.discount).toFixed(2)}</span></div>}
                <div className="flex justify-between"><span className="text-gray-600">Frete</span><span>{Number(order.shipping) === 0 ? 'Grátis' : `R$ ${Number(order.shipping).toFixed(2)}`}</span></div>
                <hr />
                <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-blue-600">R$ {Number(order.total).toFixed(2)}</span></div>
              </div>
            </div>

            {/* Address */}
            {order.address && (
              <div className="card">
                <h2 className="font-bold mb-3 flex items-center gap-2"><MapPin size={16} className="text-blue-600" /> Endereço</h2>
                <p className="text-sm text-gray-700">{order.address.street}, {order.address.number} {order.address.complement && `(${order.address.complement})`}</p>
                <p className="text-sm text-gray-500">{order.address.neighborhood}, {order.address.city} — {order.address.state}</p>
                <p className="text-sm text-gray-500">CEP {order.address.cep}</p>
              </div>
            )}

            {/* Payment */}
            {order.payment && (
              <div className="card">
                <h2 className="font-bold mb-3 flex items-center gap-2"><CreditCard size={16} className="text-blue-600" /> Pagamento</h2>
                <p className="text-sm"><span className="text-gray-500">Método:</span> {order.payment.method}</p>
                <p className="text-sm"><span className="text-gray-500">Status:</span> {order.payment.status}</p>
                {order.payment.paidAt && <p className="text-sm"><span className="text-gray-500">Pago em:</span> {new Date(order.payment.paidAt).toLocaleString('pt-BR')}</p>}
                {order.payment.method === 'PIX' && order.payment.pixCode && order.payment.status === 'PENDING' && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">Código PIX:</p>
                    <div className="bg-gray-50 p-2 rounded text-xs font-mono break-all">{order.payment.pixCode}</div>
                    <button onClick={() => { navigator.clipboard.writeText(order.payment.pixCode); toast.success('Copiado!'); }}
                      className="btn-primary w-full mt-2 text-sm py-2">Copiar Código PIX</button>
                  </div>
                )}
              </div>
            )}

            {/* Cancel */}
            {['PENDING', 'PAYMENT_PENDING'].includes(order.status) && (
              <button onClick={cancelOrder} className="w-full py-2 px-4 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors">
                Cancelar Pedido
              </button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
