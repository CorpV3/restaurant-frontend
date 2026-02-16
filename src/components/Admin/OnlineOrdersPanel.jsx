import React, { useState, useEffect } from 'react';
import { FaUber, FaMotorcycle } from 'react-icons/fa';
import { MdDeliveryDining } from 'react-icons/md';
import { FiPackage, FiClock, FiCheckCircle, FiTrendingUp } from 'react-icons/fi';
import useOrderNotifications from '../../hooks/useOrderNotifications';
import OrderTimer from '../OrderNotification/OrderTimer';
import { orderAPI } from '../../services/api';
import toast from 'react-hot-toast';

/**
 * Dedicated panel for online orders (Uber Eats, Delivery, etc.)
 * Shows real-time status and statistics
 */
const OnlineOrdersPanel = ({ restaurantId }) => {
  const [onlineOrders, setOnlineOrders] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    preparing: 0,
    ready: 0,
    completed: 0
  });
  const [loading, setLoading] = useState(true);
  const [newOrderCount, setNewOrderCount] = useState(0);

  // WebSocket connection for real-time updates
  useOrderNotifications(restaurantId, (notification) => {
    // New order notification
    if (notification.event === 'order.created' && notification.order_type === 'ONLINE') {
      setNewOrderCount(prev => prev + 1);
      fetchOnlineOrders(); // Refresh the list
    }
  });

  useEffect(() => {
    if (restaurantId) {
      fetchOnlineOrders();

      // Refresh every 30 seconds
      const interval = setInterval(fetchOnlineOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [restaurantId]);

  const fetchOnlineOrders = async () => {
    try {
      const response = await orderAPI.list(restaurantId, { limit: 100 });

      // Filter for online orders (Uber Eats, delivery platforms)
      const online = response.data.filter(order =>
        order.order_type === 'ONLINE'
      );

      // Sort by creation time (newest first)
      online.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setOnlineOrders(online);

      // Calculate stats
      const newStats = {
        total: online.length,
        pending: online.filter(o => o.status === 'pending').length,
        confirmed: online.filter(o => o.status === 'confirmed').length,
        preparing: online.filter(o => o.status === 'preparing').length,
        ready: online.filter(o => o.status === 'ready').length,
        completed: online.filter(o => o.status === 'completed').length
      };
      setStats(newStats);

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch online orders:', error);
      toast.error('Failed to load online orders');
      setLoading(false);
    }
  };

  const getOrderIcon = (orderType) => {
    // For now, all ONLINE orders show Uber icon (can enhance later to detect platform from order details)
    if (orderType === 'ONLINE') return <FaUber className="text-green-600" />;
    return <MdDeliveryDining className="text-blue-600" />;
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      confirmed: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Confirmed' },
      preparing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Preparing' },
      ready: { bg: 'bg-green-100', text: 'text-green-800', label: 'Ready' },
      completed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Completed' }
    };

    const badge = badges[status] || badges.pending;

    return (
      <span className={`${badge.bg} ${badge.text} px-2 py-1 rounded-full text-xs font-semibold`}>
        {badge.label}
      </span>
    );
  };

  const activeOrders = onlineOrders.filter(o => !['completed', 'cancelled', 'served'].includes(o.status));

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FaMotorcycle className="text-2xl text-green-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Online Orders</h2>
              <p className="text-sm text-gray-500">Uber Eats • Delivery Orders</p>
            </div>
          </div>

          {newOrderCount > 0 && (
            <div className="bg-red-500 text-white px-3 py-1 rounded-full font-bold animate-pulse">
              {newOrderCount} New
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 p-6 border-b border-gray-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{activeOrders.length}</div>
          <div className="text-xs text-gray-500 flex items-center justify-center mt-1">
            <FiClock className="mr-1" />
            Active
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending + stats.confirmed}</div>
          <div className="text-xs text-gray-500 mt-1">Pending</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.preparing}</div>
          <div className="text-xs text-gray-500 mt-1">Preparing</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
          <div className="text-xs text-gray-500 flex items-center justify-center mt-1">
            <FiCheckCircle className="mr-1" />
            Ready
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="p-6">
        {activeOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-3">📦</div>
            <p className="text-gray-600">No active online orders</p>
            <p className="text-sm text-gray-500 mt-1">New orders will appear here automatically</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activeOrders.map((order) => (
              <div
                key={order.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">
                      {getOrderIcon(order.order_type)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {order.order_number}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.customer_name || 'Guest'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {getStatusBadge(order.status)}
                    <OrderTimer
                      createdAt={order.created_at}
                      className="text-xs mt-1 justify-end"
                    />
                  </div>
                </div>

                {/* Order Details */}
                <div className="mt-2 space-y-1">
                  {order.items && order.items.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="text-sm text-gray-600 flex justify-between">
                      <span>{item.item_name}</span>
                      <span className="font-semibold">×{item.quantity}</span>
                    </div>
                  ))}
                  {order.items && order.items.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{order.items.length - 2} more items
                    </div>
                  )}
                </div>

                {/* Delivery Address */}
                {order.delivery_address && (
                  <div className="mt-2 text-xs text-gray-500 bg-gray-100 p-2 rounded">
                    📍 {order.delivery_address}
                  </div>
                )}

                {/* Total */}
                <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">Total</span>
                  <span className="text-lg font-bold text-gray-900">
                    ${order.total?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {stats.completed > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center">
              <FiTrendingUp className="mr-1" />
              Today's completed orders
            </span>
            <span className="font-bold text-gray-900">{stats.completed}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineOrdersPanel;
