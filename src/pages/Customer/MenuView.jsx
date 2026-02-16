import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FiShoppingCart, FiPlus, FiMinus } from 'react-icons/fi';
import { restaurantAPI, menuAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function MenuView() {
  const { restaurantId } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [tableInfo, setTableInfo] = useState(null);

  useEffect(() => {
    // Load table info from session (set by QR scan)
    const savedTableInfo = sessionStorage.getItem('currentTable');
    if (savedTableInfo) {
      setTableInfo(JSON.parse(savedTableInfo));
    }
    fetchData();
  }, [restaurantId]);

  const fetchData = async () => {
    try {
      const [restaurantRes, menuRes] = await Promise.all([
        restaurantAPI.get(restaurantId),
        menuAPI.list(restaurantId, { is_available: true }),
      ]);
      setRestaurant(restaurantRes.data);
      setMenuItems(menuRes.data);
    } catch (error) {
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item) => {
    const existing = cart.find((i) => i.id === item.id);
    if (existing) {
      setCart(cart.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
    toast.success('Added to cart!');
  };

  const updateQuantity = (itemId, delta) => {
    setCart(
      cart
        .map((item) =>
          item.id === itemId ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const filteredItems = menuItems.filter((item) => {
    if (filter === 'vegetarian') return item.is_vegetarian;
    if (filter === 'vegan') return item.is_vegan;
    return true;
  });

  const categories = [...new Set(menuItems.map((item) => item.category))];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Restaurant Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Table Info Banner (if scanned from QR) */}
          {tableInfo && (
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-lg mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🍽️</span>
                <div>
                  <p className="font-bold text-lg">Table {tableInfo.tableNumber}</p>
                  <p className="text-sm opacity-90">Dining in • Order will be delivered to your table</p>
                </div>
              </div>
              <button
                onClick={() => sessionStorage.removeItem('currentTable')}
                className="text-white hover:bg-white hover:bg-opacity-20 px-3 py-1 rounded text-sm"
              >
                Change
              </button>
            </div>
          )}

          <h1 className="text-3xl font-bold text-gray-900">{restaurant?.name}</h1>
          <p className="text-gray-600 mt-2">{restaurant?.description}</p>
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('vegetarian')}
              className={`px-4 py-2 rounded-lg ${filter === 'vegetarian' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
            >
              🌱 Vegetarian
            </button>
            <button
              onClick={() => setFilter('vegan')}
              className={`px-4 py-2 rounded-lg ${filter === 'vegan' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
            >
              🥬 Vegan
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Menu Items by Category */}
        {categories.map((category) => {
          const categoryItems = filteredItems.filter((item) => item.category === category);
          if (categoryItems.length === 0) return null;

          return (
            <div key={category} className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Menu Item Image */}
                    {item.image_url && (
                      <div className="w-full h-48 overflow-hidden">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    {!item.image_url && (
                      <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <span className="text-6xl">🍽️</span>
                      </div>
                    )}

                    <div className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                        <span className="text-xl font-bold text-blue-600">{restaurant?.currency_symbol || '$'}{item.price.toFixed(2)}</span>
                      </div>

                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{item.description}</p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {item.is_vegetarian && (
                          <span className="badge badge-success text-xs">🌱 Vegetarian</span>
                        )}
                        {item.is_vegan && (
                          <span className="badge badge-success text-xs">🥬 Vegan</span>
                        )}
                        {item.preparation_time && (
                          <span className="badge badge-info text-xs">⏱️ {item.preparation_time} min</span>
                        )}
                      </div>

                      <button
                        onClick={() => addToCart(item)}
                        className="w-full btn-primary flex items-center justify-center gap-2"
                      >
                        <FiPlus /> Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Cart */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-lg font-bold">Cart ({cart.length} items)</p>
                <p className="text-2xl font-bold text-blue-600">{restaurant?.currency_symbol || '$'}{cartTotal.toFixed(2)}</p>
              </div>
              <button className="btn-primary px-8 py-3 text-lg">
                Checkout
              </button>
            </div>

            {/* Cart Items */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">{restaurant?.currency_symbol || '$'}{item.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                    >
                      <FiMinus />
                    </button>
                    <span className="font-bold w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700"
                    >
                      <FiPlus />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
