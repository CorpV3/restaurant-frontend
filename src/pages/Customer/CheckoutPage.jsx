import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useCartStore } from '../../store/cartStore';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const restaurantSlug = searchParams.get('restaurant');

  const { items, getGrandTotal, clearCart, restaurantId } = useCartStore();

  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [orderType, setOrderType] = useState('dine_in');
  const [tableInfo, setTableInfo] = useState(null);

  const [orderData, setOrderData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    delivery_address: '',
    table_number: '',
    special_instructions: ''
  });

  // Load customer from localStorage and table from sessionStorage or URL
  useEffect(() => {
    // Load customer if logged in
    const storedCustomer = localStorage.getItem('customer');
    if (storedCustomer) {
      const customerData = JSON.parse(storedCustomer);
      setCustomer(customerData);

      // Pre-fill form
      setOrderData(prev => ({
        ...prev,
        customer_name: `${customerData.first_name} ${customerData.last_name}`,
        customer_phone: customerData.phone_number || '',
        customer_email: customerData.email || '',
        delivery_address: customerData.default_delivery_address || ''
      }));
    }

    // Load table info from sessionStorage (QR scan flow)
    const savedTableInfo = sessionStorage.getItem('currentTable');
    if (savedTableInfo) {
      const table = JSON.parse(savedTableInfo);
      setTableInfo(table);
      setOrderData(prev => ({
        ...prev,
        table_number: table.tableNumber
      }));
      setOrderType('dine_in'); // Force dine-in if scanned from table
    }
    // Also check URL parameters (direct QR link)
    else if (searchParams.get('table') && searchParams.get('tableNumber')) {
      const tableFromUrl = {
        tableId: searchParams.get('table'),
        tableNumber: searchParams.get('tableNumber'),
        restaurantId: restaurantId
      };
      setTableInfo(tableFromUrl);
      setOrderData(prev => ({
        ...prev,
        table_number: tableFromUrl.tableNumber
      }));
      setOrderType('dine_in'); // Force dine-in if from table QR URL
    }
  }, []);

  // Check if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      navigate(`/customer/menu?restaurant=${restaurantSlug}`);
    }
  }, [items, navigate, restaurantSlug]);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare order items
      const orderItems = items.map(item => ({
        menu_item_id: item.id,
        quantity: item.quantity,
        price: parseFloat(item.price),
        special_instructions: item.special_instructions || ''
      }));

      // Calculate totals
      const subtotal = getGrandTotal();
      const tax = subtotal * 0.1;
      const total = subtotal + tax;

      // Generate guest name if not provided
      let customerName = orderData.customer_name.trim();
      if (!customerName) {
        const guestNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        customerName = `Guest-${guestNumber}`;
      }

      // Generate guest phone if not provided
      let customerPhone = orderData.customer_phone.trim();
      if (!customerPhone) {
        customerPhone = 'Not provided';
      }

      // Map frontend order types to backend enum values
      // Frontend: dine_in, takeout, delivery
      // Backend: table, online
      const backendOrderType = orderType === 'dine_in' ? 'table' : 'online';

      // Create order payload
      const orderPayload = {
        restaurant_id: restaurantId,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: orderData.customer_email || null,
        order_type: backendOrderType,
        delivery_address: orderType === 'delivery' ? orderData.delivery_address : null,
        table_id: tableInfo?.tableId || null, // Use table from QR scan
        items: orderItems,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        special_instructions: orderData.special_instructions,
        status: 'pending'
      };

      console.log('Placing order:', orderPayload);

      const response = await axios.post(
        '/api/v1/orders',
        orderPayload
      );

      toast.success('Order placed successfully!');

      // Redirect to order tracking FIRST
      navigate(`/customer/order-tracking/${response.data.id}`);

      // Clear cart AFTER navigation
      setTimeout(() => clearCart(), 100);

    } catch (error) {
      console.error('Order placement failed:', error);
      toast.error(error.response?.data?.detail || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = getGrandTotal();
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/customer/menu?restaurant=${restaurantSlug}`)}
            className="text-blue-600 hover:underline mb-4"
          >
            ← Back to Menu
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Checkout</h1>
          <p className="text-gray-600 mt-2">Review and complete your order</p>
        </div>

        <form onSubmit={handlePlaceOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Details Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Table Info Banner (if from QR scan) */}
              {tableInfo && (
                <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🍽️</span>
                    <div>
                      <p className="font-bold text-lg">Table {tableInfo.tableNumber}</p>
                      <p className="text-sm opacity-90">Your order will be delivered to this table</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Type */}
              {!tableInfo && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">Order Type</h2>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setOrderType('dine_in')}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                        orderType === 'dine_in'
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      🍽️ Dine In
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('takeout')}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                        orderType === 'takeout'
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      🛍️ Takeout
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('delivery')}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                        orderType === 'delivery'
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      🚚 Delivery
                    </button>
                  </div>
                </div>
              )}

              {/* Customer Information */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Your Information</h2>

                {customer ? (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      ✓ Logged in as <strong>{customer.email}</strong>
                    </p>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      📝 Ordering as guest
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name {customer ? '*' : '(Optional - Guest order)'}
                    </label>
                    <input
                      type="text"
                      required={!!customer}
                      value={orderData.customer_name}
                      onChange={(e) =>
                        setOrderData({ ...orderData, customer_name: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={customer ? "John Doe" : "Optional - Auto-generated if empty"}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number {customer ? '*' : '(Optional - Guest order)'}
                    </label>
                    <input
                      type="tel"
                      required={!!customer}
                      value={orderData.customer_phone}
                      onChange={(e) =>
                        setOrderData({ ...orderData, customer_phone: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={customer ? "+1234567890" : "Optional"}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={orderData.customer_email}
                      onChange={(e) =>
                        setOrderData({ ...orderData, customer_email: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="your@email.com"
                    />
                  </div>

                  {orderType === 'delivery' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Delivery Address *
                      </label>
                      <textarea
                        required
                        value={orderData.delivery_address}
                        onChange={(e) =>
                          setOrderData({ ...orderData, delivery_address: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows="3"
                        placeholder="123 Main St, Apt 4B"
                      />
                    </div>
                  )}

                  {orderType === 'dine_in' && !tableInfo && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Table Number (Optional)
                      </label>
                      <input
                        type="text"
                        value={orderData.table_number}
                        onChange={(e) =>
                          setOrderData({ ...orderData, table_number: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="5"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Special Instructions
                    </label>
                    <textarea
                      value={orderData.special_instructions}
                      onChange={(e) =>
                        setOrderData({ ...orderData, special_instructions: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows="3"
                      placeholder="Any special requests or dietary restrictions..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 sticky top-6">
                <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

                {/* Items List */}
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold">
                        ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (10%)</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Place Order Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Placing Order...' : `Place Order - $${total.toFixed(2)}`}
                </button>

                {!customer && (
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    Want to save your info?{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/customer-login')}
                      className="text-blue-600 hover:underline"
                    >
                      Create an account
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckoutPage;
