import { useState, useEffect, useRef, useCallback } from 'react';
import { FiShoppingBag, FiCheck, FiRefreshCw, FiLogOut, FiDollarSign, FiWifi, FiWifiOff } from 'react-icons/fi';
import toast from 'react-hot-toast';
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
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
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

export default function StaffDashboard() {
  const { user, logout } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [newOrderIds, setNewOrderIds] = useState(new Set());
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const knownOrderIds = useRef(new Set());

  const fetchOrders = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      const response = await orderAPI.list(user.restaurant_id, { limit: 100 });
      const active = response.data.filter(
        o => !['completed', 'cancelled'].includes(o.status)
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

    // Fallback polling every 30s in case WebSocket misses anything
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

  const markCompleted = async (orderId) => {
    try {
      await orderAPI.updateStatus(orderId, 'completed');
      toast.success('Order completed');
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
            <button
              onClick={() => fetchOrders(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
            >
              <FiLogOut />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
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
      </main>
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
