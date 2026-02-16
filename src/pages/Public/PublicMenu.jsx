import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiShoppingCart, FiPlus, FiMinus, FiX, FiCheck, FiUser, FiLogIn } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { restaurantAPI, menuAPI, orderAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

export default function PublicMenu() {
  const { restaurantId, tableId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);

  // Customer info for order
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    specialInstructions: ''
  });

  useEffect(() => {
    fetchRestaurantAndMenu();
  }, [restaurantId]);

  const fetchRestaurantAndMenu = async () => {
    try {
      // Fetch restaurant details
      const restaurantRes = await restaurantAPI.get(restaurantId);
      setRestaurant(restaurantRes.data);

      // Fetch menu items
      const menuRes = await menuAPI.list(restaurantId, { is_available: true });
      setMenuItems(menuRes.data);
    } catch (error) {
      console.error('Failed to fetch menu:', error);
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);

    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1, itemInstructions: '' }]);
    }

    toast.success(`Added ${item.name} to cart`);
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCart(cart.map(item =>
      item.id === itemId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
    toast.success('Item removed from cart');
  };

  const updateItemInstructions = (itemId, instructions) => {
    setCart(cart.map(item =>
      item.id === itemId
        ? { ...item, itemInstructions: instructions }
        : item
    ));
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.10; // 10% tax
    return {
      subtotal,
      tax,
      total: subtotal + tax
    };
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setOrderSubmitting(true);

    try {
      // Generate guest name if not provided
      let customerName = customerInfo.name.trim();
      if (!customerName) {
        const guestNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        customerName = `Guest-${guestNumber}`;
      }

      // Generate guest phone if not provided
      let customerPhone = customerInfo.phone.trim();
      if (!customerPhone) {
        customerPhone = 'Not provided';
      }

      const orderData = {
        restaurant_id: restaurantId,
        table_id: tableId,
        customer_name: customerName,
        customer_phone: customerPhone,
        special_instructions: customerInfo.specialInstructions || null,
        order_type: 'table',
        items: cart.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          special_instructions: item.itemInstructions || null
        }))
      };

      const response = await orderAPI.create(orderData);

      toast.success('Order placed successfully!');

      // Clear cart and customer info
      setCart([]);
      setCustomerInfo({ name: '', phone: '', specialInstructions: '' });
      setShowCart(false);

      // Navigate to order tracking
      navigate(`/order/${response.data.id}`);
    } catch (error) {
      console.error('Failed to place order:', error);
      toast.error(error.response?.data?.detail || 'Failed to place order');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const groupedMenu = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  const totals = calculateTotal();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{restaurant?.name || 'Menu'}</h1>
              <p className="text-gray-600 mt-1">{restaurant?.description}</p>
              {tableId && (
                <p className="text-sm text-gray-500 mt-2">Table: {tableId.substring(0, 8)}</p>
              )}
            </div>

            {/* Optional Login/Signup Buttons */}
            {!isAuthenticated && (
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => navigate('/customer-login')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <FiLogIn /> Login
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <FiUser /> Sign Up
                </button>
              </div>
            )}

            {/* Logged in user info */}
            {isAuthenticated && (
              <div className="flex items-center gap-2 ml-4 px-4 py-2 bg-green-50 rounded-lg">
                <FiUser className="text-green-600" />
                <span className="text-sm font-semibold text-green-900">{user?.full_name || user?.username}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="max-w-4xl mx-auto p-6">
        {Object.entries(groupedMenu).map(([category, items]) => (
          <div key={category} className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 capitalize">
              {category.replace('_', ' ')}
            </h2>

            <div className="grid gap-4">
              {items.map((item) => (
                <div key={item.id} className="bg-white rounded-xl overflow-hidden shadow hover:shadow-md transition-shadow">
                  <div className="flex gap-4">
                    {/* Menu Item Image */}
                    {item.image_url ? (
                      <div className="w-24 h-24 flex-shrink-0">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <span className="text-3xl">🍽️</span>
                      </div>
                    )}

                    <div className="flex-1 p-4 flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        )}

                        <div className="flex gap-2 mt-2 flex-wrap">
                          {item.is_vegetarian && (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                              Vegetarian
                            </span>
                          )}
                          {item.is_vegan && (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                              Vegan
                            </span>
                          )}
                          {item.is_gluten_free && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                              Gluten Free
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">${item.price.toFixed(2)}</p>
                        <button
                          onClick={() => addToCart(item)}
                          className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-1 text-sm font-semibold"
                        >
                          <FiPlus /> Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {menuItems.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-xl">No menu items available</p>
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-full shadow-lg flex items-center gap-3 font-semibold text-lg z-50"
        >
          <FiShoppingCart className="text-2xl" />
          View Cart ({cart.length})
          <span className="ml-2">${totals.total.toFixed(2)}</span>
        </button>
      )}

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Your Order</h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <FiX className="text-2xl" />
              </button>
            </div>

            <div className="p-6">
              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                {cart.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{item.name}</h3>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <FiX />
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 border border-gray-300 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-2 hover:bg-gray-100"
                        >
                          <FiMinus />
                        </button>
                        <span className="font-semibold w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-2 hover:bg-gray-100"
                        >
                          <FiPlus />
                        </button>
                      </div>
                      <span className="font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>

                    <input
                      type="text"
                      placeholder="Special instructions (optional)"
                      value={item.itemInstructions}
                      onChange={(e) => updateItemInstructions(item.id, e.target.value)}
                      className="mt-2 w-full p-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                ))}
              </div>

              {/* Customer Info */}
              <div className="space-y-4 mb-6">
                <h3 className="font-semibold text-lg">Your Information (Optional)</h3>
                <input
                  type="text"
                  placeholder="Name (Optional - Auto-generated if empty)"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
                <input
                  type="tel"
                  placeholder="Phone (Optional)"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
                <textarea
                  placeholder="Special instructions for your order (Optional)"
                  value={customerInfo.specialInstructions}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, specialInstructions: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  rows="3"
                />
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="flex justify-between mb-2">
                  <span>Subtotal</span>
                  <span>${totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Tax (10%)</span>
                  <span>${totals.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-300">
                  <span>Total</span>
                  <span>${totals.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Place Order Button */}
              <button
                onClick={placeOrder}
                disabled={orderSubmitting || cart.length === 0}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 text-lg"
              >
                {orderSubmitting ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    Placing Order...
                  </>
                ) : (
                  <>
                    <FiCheck /> Place Order
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
