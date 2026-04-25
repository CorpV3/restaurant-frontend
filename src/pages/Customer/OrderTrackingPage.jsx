import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const STATUSES = [
  { key: 'pending',   label: 'Order Received',   icon: '📋', desc: 'Your order has been received' },
  { key: 'confirmed', label: 'Confirmed',         icon: '✅', desc: 'Kitchen has confirmed your order' },
  { key: 'preparing', label: 'Preparing',         icon: '👨‍🍳', desc: 'Your food is being prepared' },
  { key: 'ready',     label: 'Ready to Serve',    icon: '✨', desc: 'Your food is ready!' },
  { key: 'served',    label: 'Served',            icon: '🍽️', desc: 'Enjoy your meal!' },
  { key: 'completed', label: 'Completed',         icon: '🎉', desc: 'Thank you for dining with us!' },
];

export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder]                   = useState(null);
  const [restaurant, setRestaurant]         = useState(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [generatingReceipt, setGeneratingReceipt] = useState(false);

  // Refs to avoid stale-closure bugs and manage polling
  const hasLoadedRef  = useRef(false);
  const intervalRef   = useRef(null);

  const fetchOrder = useCallback(async (silent = false) => {
    try {
      const res = await axios.get(`/api/v1/orders/${orderId}`);
      const data = res.data;
      setOrder(data);
      setError(null);

      // Fetch restaurant once
      if (!hasLoadedRef.current && data.restaurant_id) {
        try {
          const rRes = await axios.get(`/api/v1/restaurants/${data.restaurant_id}`);
          setRestaurant(rRes.data);
        } catch { /* ignore — currency fallback below */ }
      }

      hasLoadedRef.current = true;
      if (!silent) setLoading(false);
    } catch (err) {
      if (!hasLoadedRef.current) {
        // Initial load failed — show error state
        const msg =
          err.response?.data?.detail ||
          (err.response?.status === 404 ? 'Order not found' : 'Failed to load order');
        setError(msg);
        if (!silent) setLoading(false);
      }
      // Subsequent poll failures are silently ignored (screen lock etc.)
    }
  }, [orderId]);

  // Start / stop polling based on tab visibility
  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => fetchOrder(true), 10000);
  }, [fetchOrder]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!orderId) { setLoading(false); return; }

    fetchOrder(false);
    startPolling();

    // Pause polling when tab is hidden (screen lock, switch app) — resume on return
    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchOrder(true);  // immediate refresh on wake
        startPolling();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [orderId, fetchOrder, startPolling, stopPolling]);

  const handleGenerateReceipt = async () => {
    if (!window.confirm('Request the bill? Staff will come to your table to collect payment.')) return;
    setGeneratingReceipt(true);
    try {
      const res = await axios.post(`/api/v1/orders/${orderId}/generate-receipt`);
      setOrder(res.data);
      toast.success('Bill requested! Staff will be with you shortly.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to request bill');
    } finally {
      setGeneratingReceipt(false);
    }
  };

  const sym = restaurant?.currency_symbol || '£';
  const currentIdx = STATUSES.findIndex(s => s.key === order?.status);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading your order...</p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Order Not Found</h2>
          <p className="text-gray-500 text-sm mb-6">{error || 'We could not find this order.'}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isActive   = !['completed', 'cancelled'].includes(order.status);
  const isServed   = order.status === 'served';
  const isComplete = order.status === 'completed';
  const isCancelled = order.status === 'cancelled';
  const canRequestBill = isServed;

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white pb-10">

      {/* ── Header ── */}
      <div className="bg-white border-b border-orange-100 px-4 py-5 text-center shadow-sm">
        {restaurant?.logo_url && (
          <img src={restaurant.logo_url} alt={restaurant.name} className="h-10 mx-auto mb-2 object-contain" />
        )}
        <h1 className="text-lg font-bold text-gray-800">{restaurant?.name || 'Restaurant'}</h1>
        <p className="text-xs text-gray-400 mt-0.5">Order #{order.order_number}</p>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-5 space-y-4">

        {/* ── Status Card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Current status hero */}
          <div className={`px-5 py-5 text-center ${
            isCancelled ? 'bg-red-50' : isComplete ? 'bg-green-50' : 'bg-orange-50'
          }`}>
            <div className="text-4xl mb-2">
              {isCancelled ? '❌' : STATUSES[currentIdx]?.icon || '📋'}
            </div>
            <p className={`text-lg font-bold ${
              isCancelled ? 'text-red-700' : isComplete ? 'text-green-700' : 'text-orange-700'
            }`}>
              {isCancelled ? 'Order Cancelled' : STATUSES[currentIdx]?.label || order.status}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {isCancelled ? 'Please speak to a member of staff.' : STATUSES[currentIdx]?.desc || ''}
            </p>
            {isActive && !isCancelled && (
              <div className="flex items-center justify-center gap-1.5 mt-3 text-orange-500 text-xs font-medium">
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                Live updates every 10 seconds
              </div>
            )}
          </div>

          {/* Progress steps */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between relative">
              {/* connector line */}
              <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 z-0" />
              <div
                className="absolute top-4 left-4 h-0.5 bg-orange-400 z-0 transition-all duration-500"
                style={{ width: currentIdx < 0 ? '0%' : `${(currentIdx / (STATUSES.length - 1)) * 100}%` }}
              />
              {STATUSES.map((s, i) => {
                const done    = i < currentIdx;
                const current = i === currentIdx;
                return (
                  <div key={s.key} className="flex flex-col items-center z-10 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                      done    ? 'bg-orange-500 border-orange-500 text-white' :
                      current ? 'bg-white border-orange-500 text-orange-600 ring-4 ring-orange-100' :
                                'bg-white border-gray-200 text-gray-300'
                    }`}>
                      {done ? '✓' : i + 1}
                    </div>
                    <p className={`text-xs mt-1 text-center leading-tight hidden sm:block ${
                      current ? 'text-orange-600 font-semibold' : done ? 'text-gray-600' : 'text-gray-300'
                    }`}>
                      {s.label.split(' ')[0]}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Bill Request Banner ── */}
        {canRequestBill && (
          <div className="bg-orange-500 rounded-2xl px-5 py-4 flex items-center justify-between shadow-md">
            <div>
              <p className="text-white font-bold">Ready to pay?</p>
              <p className="text-orange-100 text-xs mt-0.5">Tap to request the bill</p>
            </div>
            <button
              onClick={handleGenerateReceipt}
              disabled={generatingReceipt}
              className="bg-white text-orange-600 font-bold px-4 py-2 rounded-xl text-sm hover:bg-orange-50 transition-colors disabled:opacity-60 flex-shrink-0"
            >
              {generatingReceipt ? '...' : 'Request Bill'}
            </button>
          </div>
        )}

        {/* ── Completed banner ── */}
        {isComplete && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 text-center">
            <p className="text-green-800 font-bold">✅ Payment Collected</p>
            <p className="text-green-600 text-sm mt-1">Thank you for dining with us! We hope to see you again.</p>
          </div>
        )}

        {/* ── Order Items ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">Your Order</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(order.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
              {order.order_type && ` · ${order.order_type.charAt(0).toUpperCase() + order.order_type.slice(1).toLowerCase()}`}
            </p>
          </div>

          <div className="divide-y divide-gray-50">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 px-5 py-3">
                {item.item_image_url ? (
                  <img
                    src={item.item_image_url}
                    alt={item.item_name}
                    className="w-14 h-14 object-cover rounded-xl flex-shrink-0"
                    onError={e => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl">
                    🍽️
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm">{item.item_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {sym}{parseFloat(item.item_price || 0).toFixed(2)} × {item.quantity}
                  </p>
                  {item.special_instructions && (
                    <p className="text-xs text-orange-500 italic mt-0.5 truncate">Note: {item.special_instructions}</p>
                  )}
                </div>
                <p className="font-bold text-gray-800 text-sm flex-shrink-0">
                  {sym}{(parseFloat(item.item_price || 0) * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-1.5">
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>−{sym}{parseFloat(order.discount_amount).toFixed(2)}</span>
              </div>
            )}
            {order.tax > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>VAT</span>
                <span>{sym}{parseFloat(order.tax).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-gray-200">
              <span className="font-bold text-gray-800">Total</span>
              <span className="text-xl font-bold text-orange-500">
                {sym}{parseFloat(order.total || order.total_amount || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Special Instructions ── */}
        {order.special_instructions && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Order Note</p>
            <p className="text-sm text-amber-800">{order.special_instructions}</p>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              if (order.table_id && order.restaurant_id) {
                navigate(`/table/${order.restaurant_id}/${order.table_id}`);
              } else {
                navigate('/');
              }
            }}
            className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition-colors shadow-sm"
          >
            🍽️ Order More Items
          </button>
          <button
            onClick={() => window.print()}
            className="w-full bg-white border border-gray-200 text-gray-700 py-4 rounded-2xl font-semibold hover:bg-gray-50 transition-colors shadow-sm"
          >
            🖨️ Print Receipt
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          {restaurant?.name && `${restaurant.name} · `}Powered by Nexserv
        </p>
      </div>
    </div>
  );
}
