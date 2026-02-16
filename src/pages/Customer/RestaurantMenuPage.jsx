import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useCartStore } from '../../store/cartStore';

const RestaurantMenuPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const restaurantSlug = searchParams.get('restaurant');

  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCart, setShowCart] = useState(false);
  const [tableInfo, setTableInfo] = useState(null);

  const { items, addItem, removeItem, updateQuantity, getItemCount, getGrandTotal, clearCart } = useCartStore();

  // Load table info from URL parameters
  useEffect(() => {
    const tableId = searchParams.get('table');
    const tableNumber = searchParams.get('tableNumber');

    if (tableId && tableNumber) {
      const tableData = {
        tableId,
        tableNumber,
        restaurantId: restaurant?.id
      };
      setTableInfo(tableData);
      // Store in sessionStorage for checkout page
      sessionStorage.setItem('currentTable', JSON.stringify(tableData));
    }
  }, [searchParams, restaurant]);

  // Fetch restaurant and menu
  useEffect(() => {
    const fetchData = async () => {
      if (!restaurantSlug) {
        toast.error('Restaurant not specified');
        navigate('/customer-login');
        return;
      }

      try {
        setLoading(true);

        // Fetch restaurant by slug
        const restaurantRes = await axios.get(
          `/api/v1/restaurants/slug/${restaurantSlug}`
        );
        setRestaurant(restaurantRes.data);

        // Fetch menu items
        const menuRes = await axios.get(
          `/api/v1/restaurants/${restaurantRes.data.id}/menu-items`
        );

        // Add restaurant info to each menu item for cart
        const itemsWithRestaurant = menuRes.data.map(item => ({
          ...item,
          restaurant_id: restaurantRes.data.id,
          restaurant_slug: restaurantSlug,
          restaurant_name: restaurantRes.data.name
        }));

        setMenuItems(itemsWithRestaurant);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error(error.response?.data?.detail || 'Failed to load menu');
        navigate('/customer-login');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [restaurantSlug, navigate]);

  // Categories
  const categories = [
    { value: 'all', label: 'All Items' },
    { value: 'appetizer', label: 'Appetizers' },
    { value: 'main_course', label: 'Main Course' },
    { value: 'dessert', label: 'Desserts' },
    { value: 'beverage', label: 'Beverages' },
    { value: 'side_dish', label: 'Sides' }
  ];

  // Filter menu items
  const filteredItems = selectedCategory === 'all'
    ? menuItems.filter(item => item.is_available)
    : menuItems.filter(item => item.category === selectedCategory && item.is_available);

  // Handle add to cart
  const handleAddToCart = (item) => {
    addItem(item, 1);
    toast.success(`${item.name} added to cart`);
  };

  // Get item quantity in cart
  const getItemQuantity = (itemId) => {
    const cartItem = items.find(i => i.id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white"
        style={{ backgroundColor: restaurant?.theme_color || '#2563eb' }}
      >
        <div className="container mx-auto px-4 py-8">
          {/* Table Info Banner (if from QR scan) */}
          {tableInfo && (
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-6 py-3 mb-6 flex items-center gap-3">
              <span className="text-3xl">🍽️</span>
              <div>
                <p className="font-bold text-lg">Table {tableInfo.tableNumber}</p>
                <p className="text-sm opacity-90">Your order will be delivered to this table</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {restaurant?.logo_url && (
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="w-16 h-16 rounded-full bg-white p-1"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold">{restaurant?.name}</h1>
                <p className="text-blue-100 mt-1">{restaurant?.description}</p>
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/customer-login')}
                className="text-white hover:text-blue-200"
              >
                Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  selectedCategory === category.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="container mx-auto px-4 py-8">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No items available in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const quantity = getItemQuantity(item.id);

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                  {/* Item Image */}
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gradient-to-br from-orange-100 via-pink-100 to-purple-100">
                        <span className="text-6xl">🍽️</span>
                      </div>
                    )}
                    {/* Price Tag Overlay */}
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-full shadow-lg font-bold">
                      ${parseFloat(item.price).toFixed(2)}
                    </div>
                  </div>

                  <div className="p-4">
                    {/* Item Info */}
                    <div className="mb-2">
                      <h3 className="text-xl font-bold text-gray-800 mb-1">
                        {item.name}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2 min-h-[40px]">
                        {item.description || 'Delicious menu item'}
                      </p>
                    </div>

                    {/* Dietary Info */}
                    <div className="flex gap-2 mb-3">
                      {item.is_vegetarian && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          🌱 Vegetarian
                        </span>
                      )}
                      {item.is_vegan && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          🥗 Vegan
                        </span>
                      )}
                      {item.is_gluten_free && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          Gluten Free
                        </span>
                      )}
                    </div>

                    {/* Prep Time & Calories */}
                    <div className="flex gap-4 text-xs text-gray-500 mb-3">
                      {item.preparation_time && (
                        <span>⏱️ {item.preparation_time} min</span>
                      )}
                      {item.calories && (
                        <span>🔥 {item.calories} cal</span>
                      )}
                    </div>

                    {/* Add to Cart Button */}
                    {quantity === 0 ? (
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-bold hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                      >
                        🛒 Add to Cart
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, quantity - 1)}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 font-bold text-lg shadow-md"
                        >
                          −
                        </button>
                        <span className="flex-1 text-center font-bold text-lg bg-gradient-to-r from-green-100 to-blue-100 py-2 rounded-lg">
                          {quantity} in cart
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, quantity + 1)}
                          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 font-bold text-lg shadow-md"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {getItemCount() > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setShowCart(!showCart)}
            className="bg-blue-600 text-white px-6 py-4 rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center gap-3"
          >
            <span className="text-lg">🛒</span>
            <div className="text-left">
              <div className="text-sm font-semibold">
                {getItemCount()} {getItemCount() === 1 ? 'item' : 'items'}
              </div>
              <div className="text-xs">
                ${getGrandTotal().toFixed(2)}
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowCart(false)}>
          <div
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Cart Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Your Cart</h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 bg-gray-50 p-3 rounded-lg">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-gray-600">
                        ${parseFloat(item.price).toFixed(2)} each
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="bg-gray-200 px-2 py-1 rounded text-sm"
                        >
                          −
                        </button>
                        <span className="text-sm font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="bg-gray-200 px-2 py-1 rounded text-sm"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="ml-auto text-red-600 text-sm hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cart Summary */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${getGrandTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (10%)</span>
                  <span>${(getGrandTotal() * 0.1).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total</span>
                  <span>${(getGrandTotal() * 1.1).toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout Buttons */}
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => navigate(`/customer/checkout?restaurant=${restaurantSlug}`)}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Proceed to Checkout
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Clear all items from cart?')) {
                      clearCart();
                      setShowCart(false);
                      toast.success('Cart cleared');
                    }
                  }}
                  className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Clear Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantMenuPage;
