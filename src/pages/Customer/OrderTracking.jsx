import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCheck, FiClock, FiPackage, FiCheckCircle, FiPlus, FiMinus, FiShoppingCart } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { orderAPI, menuAPI, restaurantAPI } from '../../services/api';

export default function OrderTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [showAddItems, setShowAddItems] = useState(false);
  const [newItems, setNewItems] = useState([]);
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const [generatingReceipt, setGeneratingReceipt] = useState(false);

  const statuses = [
    { key: 'pending', label: 'Order Received', icon: FiCheck },
    { key: 'confirmed', label: 'Confirmed', icon: FiCheck },
    { key: 'preparing', label: 'Preparing', icon: FiClock },
    { key: 'ready', label: 'Ready to Serve', icon: FiPackage },
    { key: 'served', label: 'Served', icon: FiCheckCircle },
    { key: 'completed', label: 'Completed', icon: FiCheckCircle },
  ];

  // Fetch order details
  useEffect(() => {
    let isMounted = true;

    const fetchOrder = async () => {
      try {
        const response = await orderAPI.get(orderId);
        if (isMounted) {
          setOrder(response.data);

          // Fetch restaurant and menu items only on initial load
          if (response.data.restaurant_id && !restaurant) {
            const restaurantResponse = await restaurantAPI.get(response.data.restaurant_id);
            setRestaurant(restaurantResponse.data);

            const menuResponse = await menuAPI.list(response.data.restaurant_id);
            setMenuItems(menuResponse.data.filter(item => item.is_available));
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch order:', error);
        if (isMounted) {
          setLoading(false);
          // Only show error toast on initial load
          if (!order) {
            toast.error('Failed to load order details');
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
    }
  }, [orderId]);

  const currentIndex = statuses.findIndex((s) => s.key === order?.status);

  // Handle adding item to new items cart
  const handleAddItem = (menuItem) => {
    const existingItem = newItems.find(item => item.id === menuItem.id);
    if (existingItem) {
      setNewItems(newItems.map(item =>
        item.id === menuItem.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setNewItems([...newItems, { ...menuItem, quantity: 1 }]);
    }
    toast.success(`${menuItem.name} added`);
  };

  // Handle updating quantity of new items
  const handleUpdateQuantity = (itemId, delta) => {
    setNewItems(newItems.map(item => {
      if (item.id === itemId) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  // Handle submitting additional items
  const handleUpdateOrder = async () => {
    if (newItems.length === 0) {
      toast.error('Please add items to update order');
      return;
    }

    setUpdatingOrder(true);
    try {
      // Create a new order with the additional items
      const orderData = {
        restaurant_id: order.restaurant_id,
        table_id: order.table_id,
        items: newItems.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          price: item.price,
        })),
        order_type: 'table',
        customer_name: order.customer_name || 'Guest',
        customer_phone: order.customer_phone || '',
      };

      await orderAPI.create(orderData);
      toast.success('Additional items ordered successfully!');
      setNewItems([]);
      setShowAddItems(false);

      // Refresh order data
      const response = await orderAPI.get(orderId);
      setOrder(response.data);
    } catch (error) {
      console.error('Failed to update order:', error);
      toast.error('Failed to add items. Please try again.');
    } finally {
      setUpdatingOrder(false);
    }
  };

  // Calculate new items total
  const newItemsTotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Handle generate receipt
  const handleGenerateReceipt = async () => {
    if (!confirm('Generate receipt and free up the table? This action cannot be undone.')) {
      return;
    }

    setGeneratingReceipt(true);
    try {
      const response = await orderAPI.generateReceipt(orderId);
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
            onClick={() => navigate('/')}
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
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-center mb-2">Order Tracking</h1>
          <p className="text-center text-gray-600 mb-2">
            Order #{order.order_number || orderId.substring(0, 8)}
          </p>
          {order.table_number && (
            <p className="text-center text-gray-500 text-sm">Table {order.table_number}</p>
          )}

          {/* Status Timeline */}
          <div className="my-8">
            {statuses.map((status, index) => {
              const Icon = status.icon;
              const isActive = index <= currentIndex;
              const isCurrent = index === currentIndex;

              return (
                <div key={status.key} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-blue-200 animate-pulse' : ''}`}
                    >
                      <Icon className="text-xl" />
                    </div>
                    {index < statuses.length - 1 && (
                      <div className={`w-1 h-12 ${isActive ? 'bg-blue-600' : 'bg-gray-200'}`} />
                    )}
                  </div>
                  <div className="ml-6">
                    <p className={`font-semibold ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                      {status.label}
                    </p>
                    {isCurrent && (
                      <p className="text-sm text-blue-600 mt-1">In progress...</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Estimated Time */}
          {order.status !== 'completed' && order.status !== 'served' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 text-center">
                ⏱️ Estimated time: <strong>15-20 minutes</strong>
              </p>
            </div>
          )}

          {/* Order Items */}
          <div className="border-t pt-6">
            <h3 className="font-bold text-lg mb-4">Order Items</h3>
            <div className="space-y-3">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start py-2 border-b last:border-b-0">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.item_name || item.menu_item_name || item.name}</p>
                      <p className="text-sm text-gray-600">
                        {restaurant?.currency_symbol || '$'}{parseFloat(item.item_price || item.price).toFixed(2)} × {item.quantity}
                      </p>
                      {item.special_instructions && (
                        <p className="text-xs text-gray-500 italic mt-1">
                          Note: {item.special_instructions}
                        </p>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 ml-4">{restaurant?.currency_symbol || '$'}{(parseFloat(item.item_price || item.price) * item.quantity).toFixed(2)}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center">No items in order</p>
              )}
            </div>
            <div className="border-t mt-4 pt-4 space-y-2">
              {order.subtotal && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{restaurant?.currency_symbol || '$'}{parseFloat(order.subtotal).toFixed(2)}</span>
                </div>
              )}
              {order.tax && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax</span>
                  <span>{restaurant?.currency_symbol || '$'}{parseFloat(order.tax).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-t pt-2">
                <p className="text-lg font-bold">Total</p>
                <p className="text-2xl font-bold text-blue-600">
                  {restaurant?.currency_symbol || '$'}{parseFloat(order.total).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Add More Items Section */}
        {order.status !== 'completed' && order.status !== 'served' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Add More Items</h3>
              <button
                onClick={() => setShowAddItems(!showAddItems)}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                {showAddItems ? 'Hide Menu' : 'Show Menu'}
              </button>
            </div>

            {showAddItems && (
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  Select items from {restaurant?.name || 'the menu'} to add to your order
                </p>
                <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                  {menuItems.length > 0 ? (
                    menuItems.map((item) => (
                      <div
                        key={item.id}
                        className="border rounded-lg p-3 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                            )}
                            <p className="text-sm font-semibold text-blue-600 mt-1">
                              {restaurant?.currency_symbol || '$'}{parseFloat(item.price).toFixed(2)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleAddItem(item)}
                            className="ml-3 bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 text-sm"
                          >
                            <FiPlus /> Add
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No menu items available</p>
                  )}
                </div>
              </div>
            )}

            {/* Cart - New Items to Add */}
            {newItems.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FiShoppingCart /> Items to Add ({newItems.length})
                </h4>
                <div className="space-y-2 mb-4">
                  {newItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-gray-600">{restaurant?.currency_symbol || '$'}{parseFloat(item.price).toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-white border rounded-lg">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            className="p-1 hover:bg-gray-100 rounded-l-lg"
                          >
                            <FiMinus className="text-gray-600" />
                          </button>
                          <span className="px-3 font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            className="p-1 hover:bg-gray-100 rounded-r-lg"
                          >
                            <FiPlus className="text-gray-600" />
                          </button>
                        </div>
                        <p className="font-semibold w-20 text-right">
                          ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center mb-4 bg-blue-50 p-3 rounded-lg">
                  <p className="font-bold">Additional Total</p>
                  <p className="text-xl font-bold text-blue-600">${newItemsTotal.toFixed(2)}</p>
                </div>

                <button
                  onClick={handleUpdateOrder}
                  disabled={updatingOrder}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {updatingOrder ? 'Placing Order...' : 'Place Additional Order'}
                </button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  This will create a new order with these items
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
          <h3 className="font-bold text-lg mb-4">Quick Actions</h3>
          <div className="flex flex-col gap-4">
            {/* Generate Receipt Button - Only show for SERVED orders */}
            {order.status === 'served' && (
              <button
                onClick={handleGenerateReceipt}
                disabled={generatingReceipt}
                className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
              >
                {generatingReceipt ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Generating Receipt...
                  </>
                ) : (
                  <>
                    ✅ Generate Receipt & Free Table
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => {
                if (order.table_id && order.restaurant_id) {
                  navigate(`/table/${order.restaurant_id}/${order.table_id}`);
                } else if (restaurant?.slug) {
                  navigate(`/customer/menu?restaurant=${restaurant.slug}`);
                } else {
                  navigate('/customer-login');
                }
              }}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md"
            >
              🍽️ Order Again
            </button>
            <button
              onClick={() => window.print()}
              className="w-full bg-gray-600 text-white py-4 rounded-lg font-semibold hover:bg-gray-700 transition-colors shadow-md"
            >
              🖨️ Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
