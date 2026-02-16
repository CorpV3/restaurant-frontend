import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const OrderTrackingPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingReceipt, setGeneratingReceipt] = useState(false);

  // Fetch order details
  useEffect(() => {
    let isMounted = true;

    const fetchOrder = async () => {
      try {
        const response = await axios.get(`/api/v1/orders/${orderId}`);
        if (isMounted) {
          setOrder(response.data);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch order:', error);
        if (isMounted) {
          setLoading(false);
          // Only show error toast on initial load
          if (!order) {
            let errorMessage = 'Failed to load order details';
            if (error.response?.data?.detail) {
              errorMessage = error.response.data.detail;
            } else if (error.response?.status === 404) {
              errorMessage = 'Order not found';
            } else if (error.message) {
              errorMessage = error.message;
            }
            toast.error(errorMessage);
          }
        }
      }
    };

    if (orderId) {
      fetchOrder();

      // Poll for updates every 10 seconds to avoid rate limiting
      const interval = setInterval(fetchOrder, 10000);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    } else {
      setLoading(false);
      toast.error('No order ID provided');
    }
  }, [orderId]);

  // Order status timeline
  const statuses = [
    { key: 'pending', label: 'Order Placed', icon: '📝', color: 'blue' },
    { key: 'confirmed', label: 'Confirmed', icon: '✅', color: 'green' },
    { key: 'preparing', label: 'Preparing', icon: '👨‍🍳', color: 'yellow' },
    { key: 'ready', label: 'Ready', icon: '✨', color: 'purple' },
    { key: 'served', label: 'Served', icon: '🍽️', color: 'indigo' },
    { key: 'completed', label: 'Completed', icon: '🎉', color: 'green' }
  ];

  const getCurrentStatusIndex = () => {
    return statuses.findIndex(s => s.key === order?.status);
  };

  const getStatusColor = (index) => {
    const currentIndex = getCurrentStatusIndex();
    if (index < currentIndex) return 'bg-green-500';
    if (index === currentIndex) return 'bg-blue-500';
    return 'bg-gray-300';
  };

  const handleGenerateReceipt = async () => {
    if (!confirm('Generate receipt and free up the table? This action cannot be undone.')) {
      return;
    }

    setGeneratingReceipt(true);
    try {
      const response = await axios.post(`/api/v1/orders/${orderId}/generate-receipt`);
      setOrder(response.data);
      toast.success('Receipt generated! Table is now available.');
    } catch (error) {
      console.error('Failed to generate receipt:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to generate receipt';
      toast.error(errorMsg);
    } finally {
      setGeneratingReceipt(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Order not found</p>
          <button
            onClick={() => navigate('/customer-login')}
            className="mt-4 text-blue-600 hover:underline"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 pb-24">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Order #{order.order_number}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Placed {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                ${parseFloat(order.total).toFixed(2)}
              </div>
              <p className="text-sm text-gray-500">{order.items?.length} items</p>
            </div>
          </div>

          {/* Customer Info */}
          <div className="border-t pt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Customer</p>
              <p className="font-medium">{order.customer_name}</p>
              <p className="text-gray-600">{order.customer_phone}</p>
            </div>
            <div>
              <p className="text-gray-500">Order Type</p>
              <p className="font-medium capitalize">{order.order_type || 'Dine In'}</p>
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-6">Order Status</h2>

          <div className="relative">
            {/* Progress Line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>

            {/* Status Steps */}
            <div className="space-y-6">
              {statuses.map((status, index) => {
                const currentIndex = getCurrentStatusIndex();
                const isPast = index < currentIndex;
                const isCurrent = index === currentIndex;
                const isFuture = index > currentIndex;

                return (
                  <div key={status.key} className="relative flex items-center gap-4">
                    {/* Status Icon */}
                    <div
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold transition-all ${getStatusColor(
                        index
                      )}`}
                    >
                      {isPast ? '✓' : index + 1}
                    </div>

                    {/* Status Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{status.icon}</span>
                        <div>
                          <p
                            className={`font-semibold ${
                              isCurrent ? 'text-blue-600' : isPast ? 'text-gray-800' : 'text-gray-400'
                            }`}
                          >
                            {status.label}
                          </p>
                          {isCurrent && (
                            <p className="text-sm text-blue-500 animate-pulse">In progress...</p>
                          )}
                          {isPast && (
                            <p className="text-sm text-gray-500">Completed</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Estimated Time */}
          {order.status !== 'completed' && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                ⏱️ Estimated time: <strong>15-20 minutes</strong>
              </p>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Order Items</h2>

          <div className="space-y-3">
            {order.items?.map((item) => (
              <div key={item.id} className="flex items-center gap-4 py-2 border-b last:border-0">
                {/* Menu Item Image */}
                {item.item_image_url && (
                  <img
                    src={item.item_image_url}
                    alt={item.item_name}
                    className="w-20 h-20 object-cover rounded-lg shadow-sm"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                {!item.item_image_url && (
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-3xl">🍽️</span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium">{item.item_name}</p>
                  <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                  {item.special_instructions && (
                    <p className="text-sm text-gray-600 italic mt-1">
                      Note: {item.special_instructions}
                    </p>
                  )}
                </div>
                <p className="font-semibold">
                  ${(parseFloat(item.item_price) * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="border-t mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${parseFloat(order.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax</span>
              <span>${parseFloat(order.tax).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total</span>
              <span>${parseFloat(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        {order.special_instructions && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-2">Special Instructions</h2>
            <p className="text-gray-700">{order.special_instructions}</p>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>

          {/* Debug: Show current status */}
          <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
            <p className="font-medium">Debug Info:</p>
            <p>Order Status: <span className="font-mono">{order.status}</span></p>
            <p>Status Type: {typeof order.status}</p>
          </div>

          {/* Generate Receipt Button - Show for SERVED or COMPLETED orders */}
          {(order.status === 'served' || order.status === 'SERVED' || order.status === 'completed' || order.status === 'COMPLETED') && (
            <button
              onClick={handleGenerateReceipt}
              disabled={generatingReceipt || order.status === 'completed' || order.status === 'COMPLETED'}
              className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg shadow-md"
            >
              {generatingReceipt ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generating Receipt...
                </>
              ) : (order.status === 'completed' || order.status === 'COMPLETED') ? (
                <>
                  ✅ Receipt Already Generated
                </>
              ) : (
                <>
                  ✅ Generate Receipt & Free Table
                </>
              )}
            </button>
          )}

          {/* Other Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => {
                if (order.table_id && order.restaurant_id) {
                  navigate(`/table/${order.restaurant_id}/${order.table_id}`);
                } else if (order.restaurant_slug) {
                  navigate(`/customer/menu?restaurant=${order.restaurant_slug}`);
                } else {
                  navigate('/customer-login');
                }
              }}
              className="flex-1 bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md"
            >
              🍽️ Order Again
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 bg-gray-600 text-white py-4 rounded-lg font-semibold hover:bg-gray-700 transition-colors shadow-md"
            >
              🖨️ Print Receipt
            </button>
          </div>
        </div>

        {/* Support */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Need help with your order?</p>
          <p className="mt-1">
            Call: <a href="tel:+1234567890" className="text-blue-600 hover:underline">+1 (234) 567-890</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingPage;
