import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FiShoppingBag, FiCheck, FiRefreshCw, FiLogOut, FiDollarSign,
  FiWifi, FiWifiOff, FiBarChart2, FiDownload, FiChevronLeft, FiChevronRight,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import useAuthStore from '../../store/authStore';
import { orderAPI } from '../../services/api';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800',
  ready: 'bg-green-100 text-green-800',
  served: 'bg-purple-100 text-purple-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

function playOrderAlert() {
  try {
    const AudioCtx = window.AudioContext || window['webkitAudioContext'];
    const ctx = new AudioCtx();
    [0, 0.15, 0.3].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = i === 2 ? 880 : 660;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.25);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.25);
    });
  } catch (_) {}
}

// ─── Date helpers ────────────────────────────────────────────────────────────

function getDateRange(period, date) {
  const d = new Date(date);
  if (period === 'daily') {
    const s = d.toISOString().split('T')[0];
    return { start: s, end: s };
  } else if (period === 'weekly') {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d);
    mon.setDate(diff);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: mon.toISOString().split('T')[0], end: sun.toISOString().split('T')[0] };
  } else {
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start: first.toISOString().split('T')[0], end: last.toISOString().split('T')[0] };
  }
}

function getDateLabel(period, date) {
  if (period === 'daily') {
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  } else if (period === 'weekly') {
    const { start, end } = getDateRange('weekly', date);
    return `${start} – ${end}`;
  } else {
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }
}

function navigateDate(period, date, dir) {
  const d = new Date(date);
  if (period === 'daily') d.setDate(d.getDate() + dir);
  else if (period === 'weekly') d.setDate(d.getDate() + dir * 7);
  else d.setMonth(d.getMonth() + dir);
  return d;
}

// ─── Components ──────────────────────────────────────────────────────────────

function PaymentModal({ orderId, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 shadow-xl w-72">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Payment Method</h3>
        <p className="text-sm text-gray-500 mb-5">How was this order paid?</p>
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => onConfirm(orderId, 'cash')}
            className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 text-sm"
          >
            💵 Cash
          </button>
          <button
            onClick={() => onConfirm(orderId, 'card')}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm"
          >
            💳 Card
          </button>
        </div>
        <button onClick={onCancel} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </div>
    </div>
  );
}

function OrderCard({ order, onServe, onComplete, highlight, isNew }) {
  const total = order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || order.total_amount || 0;

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border transition-all duration-500
      ${highlight ? 'border-green-400 ring-1 ring-green-300' : 'border-gray-200'}
      ${isNew ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold text-gray-900 flex items-center gap-1">
            {isNew && <span className="text-yellow-500 text-xs font-bold mr-1">NEW</span>}
            {order.table_number ? `Table ${order.table_number}` : `Order #${order.id?.slice(-6)}`}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(order.created_at).toLocaleTimeString()}
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
          {order.status}
        </span>
      </div>

      <div className="mb-3 space-y-1">
        {order.items?.slice(0, 4).map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span className="text-gray-700">{item.quantity}x {item.name || item.menu_item_name}</span>
            <span className="text-gray-500">£{(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        {order.items?.length > 4 && (
          <p className="text-xs text-gray-400">+{order.items.length - 4} more items</p>
        )}
      </div>

      <div className="flex justify-between items-center pt-3 border-t">
        <span className="font-bold text-gray-900 flex items-center gap-1">
          <FiDollarSign className="text-green-600" />
          {total.toFixed(2)}
        </span>
        <div className="flex gap-2">
          {order.status === 'ready' && (
            <button onClick={() => onServe(order.id)} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Serve
            </button>
          )}
          {order.status === 'served' && (
            <button onClick={() => onComplete(order.id)} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1">
              <FiCheck size={12} /> Paid
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportsTab({ restaurantId, user }) {
  const [period, setPeriod] = useState('daily');
  const [date, setDate] = useState(new Date());
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const { start, end } = getDateRange(period, date);
      const res = await orderAPI.getReports(restaurantId, { start_date: start, end_date: end });
      setReportData(res.data);
    } catch {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [restaurantId, period, date]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const exportToExcel = () => {
    if (!reportData) return;
    const rows = reportData.orders.map(o => ({
      'Order Number': o.order_number,
      'Date': new Date(o.created_at).toLocaleDateString('en-GB'),
      'Time': new Date(o.created_at).toLocaleTimeString('en-GB'),
      'Items': o.items_count,
      'Subtotal (£)': o.subtotal,
      'Tax (£)': o.tax,
      'Total (£)': o.total,
      'Payment': o.payment_method
        ? o.payment_method.charAt(0).toUpperCase() + o.payment_method.slice(1)
        : 'Unknown',
    }));

    rows.push({});
    rows.push({ 'Order Number': '--- SUMMARY ---' });
    rows.push({ 'Order Number': `Total Orders: ${reportData.summary.total_orders}`, 'Total (£)': reportData.summary.total_revenue });
    rows.push({ 'Order Number': `Cash (${reportData.summary.cash_orders} orders)`, 'Total (£)': reportData.summary.cash_total });
    rows.push({ 'Order Number': `Card (${reportData.summary.card_orders} orders)`, 'Total (£)': reportData.summary.card_total });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `pos-report-${reportData.start_date}-to-${reportData.end_date}.xlsx`);
  };

  const s = reportData?.summary;

  return (
    <div>
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Period selector */}
        <div className="flex rounded-lg overflow-hidden border bg-white">
          {['daily', 'weekly', 'monthly'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm font-medium capitalize ${period === p ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Date navigator */}
        <div className="flex items-center gap-1 bg-white rounded-lg border px-2 py-1">
          <button onClick={() => setDate(d => navigateDate(period, d, -1))} className="p-1 hover:bg-gray-100 rounded">
            <FiChevronLeft size={14} />
          </button>
          <span className="text-sm font-medium text-gray-700 px-2 min-w-[180px] text-center">
            {getDateLabel(period, date)}
          </span>
          <button onClick={() => setDate(d => navigateDate(period, d, 1))} className="p-1 hover:bg-gray-100 rounded">
            <FiChevronRight size={14} />
          </button>
        </div>

        <div className="flex gap-2 ml-auto">
          <button
            onClick={fetchReport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border rounded-lg hover:bg-gray-50"
          >
            <FiRefreshCw size={13} /> Refresh
          </button>
          <button
            onClick={exportToExcel}
            disabled={!reportData || reportData.orders.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-40"
          >
            <FiDownload size={13} /> Export Excel
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-12 text-gray-400">Loading report...</div>}

      {!loading && reportData && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <p className="text-xs text-gray-500 mb-1">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">{s.total_orders}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-200">
              <p className="text-xs text-green-700 mb-1">💵 Cash</p>
              <p className="text-2xl font-bold text-green-700">£{s.cash_total.toFixed(2)}</p>
              <p className="text-xs text-green-600 mt-1">{s.cash_orders} orders</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 shadow-sm border border-blue-200">
              <p className="text-xs text-blue-700 mb-1">💳 Card</p>
              <p className="text-2xl font-bold text-blue-700">£{s.card_total.toFixed(2)}</p>
              <p className="text-xs text-blue-600 mt-1">{s.card_orders} orders</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-400 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-white">£{s.total_revenue.toFixed(2)}</p>
            </div>
          </div>

          {/* Orders table */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Completed Orders</h3>
              <span className="text-xs text-gray-500">{reportData.orders.length} orders</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left">Order #</th>
                    <th className="px-4 py-3 text-left">Time</th>
                    <th className="px-4 py-3 text-center">Items</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                    <th className="px-4 py-3 text-right">Tax</th>
                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                    <th className="px-4 py-3 text-center">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportData.orders.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{o.order_number}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(o.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{o.items_count}</td>
                      <td className="px-4 py-3 text-right text-gray-700">£{o.subtotal.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">£{o.tax.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">£{o.total.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        {o.payment_method === 'cash' && (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">💵 Cash</span>
                        )}
                        {o.payment_method === 'card' && (
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">💳 Card</span>
                        )}
                        {!o.payment_method && (
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {reportData.orders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                        No completed orders in this period
                      </td>
                    </tr>
                  )}
                </tbody>
                {reportData.orders.length > 0 && (
                  <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                    <tr className="font-semibold text-gray-800">
                      <td className="px-4 py-3" colSpan={3}>Totals</td>
                      <td className="px-4 py-3 text-right">£{s.total_revenue > 0 ? (s.total_revenue / (1 + 0.1) * 1).toFixed(2) : '0.00'}</td>
                      <td className="px-4 py-3 text-right">
                        £{reportData.orders.reduce((sum, o) => sum + o.tax, 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-700">£{s.total_revenue.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function StaffDashboard() {
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [newOrderIds, setNewOrderIds] = useState(new Set());
  const [paymentModal, setPaymentModal] = useState(null); // { orderId }
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const knownOrderIds = useRef(new Set());

  const fetchOrders = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      const response = await orderAPI.list(user.restaurant_id, { limit: 100 });
      const active = response.data.filter(
        o => !['completed', 'cancelled'].includes(o.status) &&
             (o.order_type === 'table' || o.order_type === 'TABLE' || !o.order_type)
      );
      setOrders(active);
      active.forEach(o => knownOrderIds.current.add(o.id));
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const connectWebSocket = useCallback(() => {
    if (!user?.restaurant_id) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/orders/${user.restaurant_id}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      clearTimeout(reconnectTimer.current);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_order' || data.type === 'order_update') {
          const orderId = data.order?.id || data.order_id;
          const isNew = orderId && !knownOrderIds.current.has(orderId);

          if (isNew) {
            playOrderAlert();
            toast.success(
              `New order — Table ${data.order?.table_number || '#' + String(orderId).slice(-4)}`,
              { duration: 6000, icon: '🔔' }
            );
            setNewOrderIds(prev => new Set([...prev, orderId]));
            setTimeout(() => {
              setNewOrderIds(prev => { const n = new Set(prev); n.delete(orderId); return n; });
            }, 8000);
          }
          fetchOrders();
        }
      } catch (_) {
        fetchOrders();
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      reconnectTimer.current = setTimeout(connectWebSocket, 5000);
    };

    ws.onerror = () => ws.close();
  }, [user, fetchOrders]);

  useEffect(() => {
    if (!user?.restaurant_id) return;
    fetchOrders();
    connectWebSocket();

    const poll = setInterval(() => fetchOrders(), 30000);

    return () => {
      clearInterval(poll);
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [user, fetchOrders, connectWebSocket]);

  const markServed = async (orderId) => {
    try {
      await orderAPI.updateStatus(orderId, 'served');
      toast.success('Order marked as served');
      fetchOrders();
    } catch {
      toast.error('Failed to update order');
    }
  };

  // Opens payment method modal instead of directly completing
  const markCompleted = (orderId) => {
    setPaymentModal({ orderId });
  };

  const confirmPayment = async (orderId, paymentMethod) => {
    setPaymentModal(null);
    try {
      await orderAPI.updateStatusWithPayment(orderId, 'completed', paymentMethod);
      toast.success(`Order completed — ${paymentMethod === 'cash' ? '💵 Cash' : '💳 Card'}`);
      fetchOrders();
    } catch {
      toast.error('Failed to complete order');
    }
  };

  const readyOrders = orders.filter(o => o.status === 'ready');
  const otherOrders = orders.filter(o => o.status !== 'ready');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FiShoppingBag className="text-2xl text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">POS Dashboard</h1>
              <p className="text-sm text-gray-500">Staff: {user?.full_name || user?.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${wsConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              {wsConnected ? <FiWifi size={12} /> : <FiWifiOff size={12} />}
              {wsConnected ? 'Live' : 'Reconnecting...'}
            </span>
            {activeTab === 'orders' && (
              <button
                onClick={() => fetchOrders(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
            >
              <FiLogOut />
              Logout
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-7xl mx-auto px-4 border-t flex gap-0">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px ${
              activeTab === 'orders' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FiShoppingBag size={15} /> Active Orders
            {orders.length > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{orders.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px ${
              activeTab === 'reports' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FiBarChart2 size={15} /> Reports
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'orders' ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <p className="text-sm text-gray-500">Active Orders</p>
                <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-200">
                <p className="text-sm text-green-700">Ready to Serve</p>
                <p className="text-3xl font-bold text-green-700">{readyOrders.length}</p>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FiShoppingBag className="text-5xl mx-auto mb-3 text-gray-300" />
                <p>No active orders</p>
              </div>
            ) : (
              <div className="space-y-6">
                {readyOrders.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-green-700 mb-3 flex items-center gap-2">
                      <FiCheck /> Ready to Serve ({readyOrders.length})
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {readyOrders.map(order => (
                        <OrderCard key={order.id} order={order} onServe={markServed} onComplete={markCompleted} highlight isNew={newOrderIds.has(order.id)} />
                      ))}
                    </div>
                  </div>
                )}
                {otherOrders.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-700 mb-3">
                      Active Orders ({otherOrders.length})
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {otherOrders.map(order => (
                        <OrderCard key={order.id} order={order} onServe={markServed} onComplete={markCompleted} isNew={newOrderIds.has(order.id)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <ReportsTab restaurantId={user?.restaurant_id} user={user} />
        )}
      </main>

      {/* Payment method modal */}
      {paymentModal && (
        <PaymentModal
          orderId={paymentModal.orderId}
          onConfirm={confirmPayment}
          onCancel={() => setPaymentModal(null)}
        />
      )}
    </div>
  );
}
