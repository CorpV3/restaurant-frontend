import { useState, useEffect, useCallback, useRef } from 'react';
import { FiClock, FiCheck, FiX, FiRefreshCw, FiLogOut, FiWifi, FiWifiOff } from 'react-icons/fi';
import { FaUber } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { orderAPI } from '../../services/api';
import useOrderNotifications from '../../hooks/useOrderNotifications';
import NotificationSound from '../../components/OrderNotification/NotificationSound';
import OrderNotificationBanner from '../../components/OrderNotification/OrderNotificationBanner';
import OrderTimer from '../../components/OrderNotification/OrderTimer';

export default function KitchenDashboardEnhanced() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [playSound, setPlaySound] = useState(false);
  const [notification, setNotification] = useState(null);
  const newOrdersRef = useRef(new Set());

  // WebSocket connection for real-time notifications
  const { isConnected, connectionError, reconnect } = useOrderNotifications(
    user?.restaurant_id,
    handleNewOrderNotification
  );

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchOrders();
    }
  }, [user]);

  // Handle new order notification from WebSocket
  function handleNewOrderNotification(notificationData) {
    console.log('New order notification received:', notificationData);

    // Play sound
    setPlaySound(true);

    // Show popup notification
    setNotification({
      order_number: notificationData.order_number,
      customer_name: notificationData.customer_name,
      order_type: notificationData.order_type,
      total: notificationData.total,
      delivery_address: notificationData.delivery_address
    });

    // Track this as a new order
    if (notificationData.order_id) {
      newOrdersRef.current.add(notificationData.order_id);
    }

    // Refresh orders list to include the new order
    fetchOrders();

    // Auto-remove notification after showing
    setTimeout(() => {
      setNotification(null);
    }, 12000);
  }

  const fetchOrders = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);

      const response = await orderAPI.list(user.restaurant_id, {
        limit: 100
      });

      // Filter active orders
      const activeOrders = response.data.filter(
        order => !['completed', 'cancelled', 'served'].includes(order.status)
      );

      // Sort: Uber/Delivery orders first, then by creation time
      const sortedOrders = activeOrders.sort((a, b) => {
        // Prioritize UBER and DELIVERY orders
        const aIsOnline = ['UBER', 'DELIVERY'].includes(a.order_type);
        const bIsOnline = ['UBER', 'DELIVERY'].includes(b.order_type);

        if (aIsOnline && !bIsOnline) return -1;
        if (!aIsOnline && bIsOnline) return 1;

        // Then sort by created_at (newest first)
        return new Date(b.created_at) - new Date(a.created_at);
      });

      setOrders(sortedOrders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await orderAPI.updateStatus(orderId, newStatus);
      toast.success(`Order ${newStatus}!`);

      // Remove from new orders tracking
      newOrdersRef.current.delete(orderId);

      fetchOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const cancelOrder = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
      await orderAPI.cancel(orderId);
      toast.success('Order cancelled');

      // Remove from new orders tracking
      newOrdersRef.current.delete(orderId);

      fetchOrders();
    } catch (error) {
      console.error('Failed to cancel order:', error);
      toast.error(error.response?.data?.detail || 'Failed to cancel order');
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const statusColors = {
    pending: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    confirmed: 'bg-orange-100 border-orange-300 text-orange-800',
    preparing: 'bg-blue-100 border-blue-300 text-blue-800',
    ready: 'bg-green-100 border-green-300 text-green-800',
  };

  const getNextStatus = (currentStatus) => {
    const workflow = {
      pending: 'confirmed',
      confirmed: 'preparing',
      preparing: 'ready',
      ready: 'served'
    };
    return workflow[currentStatus];
  };

  const getButtonText = (currentStatus) => {
    const text = {
      pending: 'Confirm Order',
      confirmed: 'Start Preparing',
      preparing: 'Mark as Ready',
      ready: 'Mark as Served'
    };
    return text[currentStatus];
  };

  const getButtonColor = (currentStatus) => {
    const colors = {
      pending: 'bg-orange-600 hover:bg-orange-700',
      confirmed: 'bg-blue-600 hover:bg-blue-700',
      preparing: 'bg-green-600 hover:bg-green-700',
      ready: 'bg-purple-600 hover:bg-purple-700'
    };
    return colors[currentStatus];
  };

  const isOnlineOrder = (order) => {
    return ['UBER', 'DELIVERY'].includes(order.order_type);
  };

  const isNewOrder = (orderId) => {
    return newOrdersRef.current.has(orderId);
  };

  const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'confirmed');
  const preparingOrders = orders.filter((o) => o.status === 'preparing');
  const readyOrders = orders.filter((o) => o.status === 'ready');
  const onlineOrders = orders.filter((o) => isOnlineOrder(o));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* Audio Notification */}
      <NotificationSound
        play={playSound}
        onEnd={() => setPlaySound(false)}
      />

      {/* Popup Notification Banner */}
      {notification && (
        <OrderNotificationBanner
          order={notification}
          onClose={() => setNotification(null)}
          autoCloseDuration={10000}
        />
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Kitchen Display</h1>
            <p className="text-gray-600 mt-1">Manage incoming orders in real-time</p>
            {user && (
              <p className="text-sm text-gray-500 mt-1">
                Logged in as: <span className="font-semibold">{user.email}</span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {/* WebSocket Connection Status */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${
              isConnected
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'bg-red-50 border-red-300 text-red-700'
            }`}>
              {isConnected ? <FiWifi /> : <FiWifiOff />}
              <span className="font-semibold text-sm">
                {isConnected ? 'Live' : 'Offline'}
              </span>
              {!isConnected && connectionError && (
                <button
                  onClick={reconnect}
                  className="ml-2 text-xs underline"
                >
                  Reconnect
                </button>
              )}
            </div>

            <button
              onClick={() => fetchOrders(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-50 font-semibold"
            >
              <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
            >
              <FiLogOut />
              Logout
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-400 rounded"></div>
            <span className="font-semibold">New: {pendingOrders.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="font-semibold">Preparing: {preparingOrders.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="font-semibold">Ready: {readyOrders.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <FaUber className="text-lg" />
            <span className="font-semibold">Online Orders: {onlineOrders.length}</span>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.map((order) => {
          const isUberOrder = isOnlineOrder(order);
          const isNew = isNewOrder(order.id);

          return (
            <div
              key={order.id}
              className={`
                ${statusColors[order.status] || 'bg-gray-100 border-gray-300'}
                ${isUberOrder ? 'ring-4 ring-green-400 ring-offset-2' : ''}
                ${isNew ? 'animate-pulse-slow' : ''}
                border-4 rounded-xl p-6 bg-white shadow-lg relative overflow-hidden
              `}
            >
              {/* Uber Badge */}
              {isUberOrder && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1 rounded-bl-lg font-bold text-sm flex items-center gap-1">
                  <FaUber />
                  {order.order_type === 'UBER' ? 'Uber Eats' : 'Delivery'}
                </div>
              )}

              {/* New Order Badge */}
              {isNew && (
                <div className="absolute top-0 left-0 bg-red-500 text-white px-3 py-1 rounded-br-lg font-bold text-xs animate-pulse">
                  NEW!
                </div>
              )}

              {/* Order Header */}
              <div className="flex justify-between items-start mb-4 mt-2">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{order.order_number}</h3>
                  <p className="text-lg font-semibold text-gray-700">
                    {order.table_id ? `Table ${order.table_id.substring(0, 8)}` : 'Takeout'}
                  </p>
                  {order.customer_name && (
                    <p className="text-sm text-gray-600">{order.customer_name}</p>
                  )}
                </div>

                {/* Countdown Timer */}
                <OrderTimer
                  createdAt={order.created_at}
                  className="text-sm"
                />
              </div>

              {/* Delivery Address for Uber Orders */}
              {isUberOrder && order.delivery_address && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs font-semibold text-green-800 mb-1">Delivery Address:</p>
                  <p className="text-sm text-gray-700">{order.delivery_address}</p>
                </div>
              )}

              {/* Order Items */}
              <div className="mb-6 space-y-3">
                {order.items && order.items.map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-semibold text-gray-900">{item.item_name}</p>
                      <span className="bg-gray-900 text-white px-3 py-1 rounded-full text-sm font-bold">
                        x{item.quantity}
                      </span>
                    </div>
                    {item.special_instructions && (
                      <p className="text-sm text-red-600 font-medium">
                        Note: {item.special_instructions}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Special Instructions */}
              {order.special_instructions && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-800">
                    Order Note: {order.special_instructions}
                  </p>
                </div>
              )}

              {/* Total */}
              <div className="mb-4 flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-700">Total</span>
                <span className="text-xl font-bold text-gray-900">${order.total?.toFixed(2) || '0.00'}</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {order.status !== 'ready' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, getNextStatus(order.status))}
                    className={`w-full ${getButtonColor(order.status)} text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors`}
                  >
                    <FiCheck />
                    {getButtonText(order.status)}
                  </button>
                )}

                {order.status === 'ready' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'served')}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <FiCheck />
                    Mark as Served
                  </button>
                )}

                <button
                  onClick={() => cancelOrder(order.id)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <FiX />
                  Cancel Order
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {orders.length === 0 && (
        <div className="text-center py-20">
          <div className="text-gray-400 text-6xl mb-4">🍽️</div>
          <p className="text-xl text-gray-600">No active orders</p>
          <p className="text-gray-500 mt-2">New orders will appear here automatically</p>
        </div>
      )}
    </div>
  );
}
