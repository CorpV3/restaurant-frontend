import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiDollarSign, FiTrendingUp, FiLogOut, FiPlus, FiEdit2, FiTrash2, FiX, FiFileText } from 'react-icons/fi';
import { restaurantAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

// Country to currency mapping
const COUNTRY_CURRENCY_MAP = {
  'United States': { code: 'USD', symbol: '$' },
  'United Kingdom': { code: 'GBP', symbol: '£' },
  'European Union': { code: 'EUR', symbol: '€' },
  'Canada': { code: 'CAD', symbol: 'CA$' },
  'Australia': { code: 'AUD', symbol: 'A$' },
  'India': { code: 'INR', symbol: '₹' },
  'Japan': { code: 'JPY', symbol: '¥' },
  'China': { code: 'CNY', symbol: '¥' },
  'Singapore': { code: 'SGD', symbol: 'S$' },
  'United Arab Emirates': { code: 'AED', symbol: 'د.إ' },
  'Saudi Arabia': { code: 'SAR', symbol: '﷼' },
  'Mexico': { code: 'MXN', symbol: 'MX$' },
  'Brazil': { code: 'BRL', symbol: 'R$' },
  'Switzerland': { code: 'CHF', symbol: 'CHF' },
  'South Africa': { code: 'ZAR', symbol: 'R' },
};

export default function MasterAdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showInvoicesModal, setShowInvoicesModal] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    theme_color: '#000000',
    max_tables: 20,
    country: 'United States',
    currency_code: 'USD',
    currency_symbol: '$',
    per_table_booking_fee: 0,
    per_online_booking_fee: 0,
    enable_booking_fees: false,
  });

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const response = await restaurantAPI.list();
      console.log('Restaurants response:', response.data);
      setRestaurants(response.data);
    } catch (error) {
      console.error('Failed to fetch restaurants:', error);
      toast.error('Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCreate = () => {
    setEditingRestaurant(null);
    setFormData({
      name: '',
      description: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      theme_color: '#000000',
      max_tables: 20,
      country: 'United States',
      currency_code: 'USD',
      currency_symbol: '$',
      per_table_booking_fee: 0,
      per_online_booking_fee: 0,
      enable_booking_fees: false,
    });
    setShowModal(true);
  };

  const handleEdit = (restaurant) => {
    setEditingRestaurant(restaurant);
    setFormData({
      name: restaurant.name || '',
      description: restaurant.description || '',
      address: restaurant.address || '',
      phone: restaurant.phone || '',
      email: restaurant.email || '',
      website: restaurant.website || '',
      theme_color: restaurant.theme_color || '#000000',
      max_tables: restaurant.max_tables || 20,
      country: restaurant.country || 'United States',
      currency_code: restaurant.currency_code || 'USD',
      currency_symbol: restaurant.currency_symbol || '$',
      per_table_booking_fee: restaurant.per_table_booking_fee || 0,
      per_online_booking_fee: restaurant.per_online_booking_fee || 0,
      enable_booking_fees: restaurant.enable_booking_fees || false,
    });
    setShowModal(true);
  };

  const handleDelete = async (restaurantId, restaurantName) => {
    if (!window.confirm(`Are you sure you want to delete "${restaurantName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await restaurantAPI.delete(restaurantId);
      toast.success('Restaurant deleted successfully!');
      fetchRestaurants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete restaurant');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingRestaurant) {
        await restaurantAPI.update(editingRestaurant.id, formData);
        toast.success('Restaurant updated successfully!');
      } else {
        await restaurantAPI.create(formData);
        toast.success('Restaurant created successfully!');
      }
      setShowModal(false);
      fetchRestaurants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save restaurant');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'max_tables' ? parseInt(value) || 0 : value,
    }));
  };

  const handleCountryChange = (country) => {
    const currency = COUNTRY_CURRENCY_MAP[country] || { code: 'USD', symbol: '$' };
    setFormData({
      ...formData,
      country,
      currency_code: currency.code,
      currency_symbol: currency.symbol,
    });
  };

  const handleViewInvoices = async (restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowInvoicesModal(true);
    setLoadingInvoices(true);
    try {
      const response = await restaurantAPI.listInvoices(restaurant.id);
      setInvoices(response.data);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleGenerateInvoice = async (restaurant) => {
    if (!confirm(`Generate invoice for ${restaurant.name}? This will create a new billing invoice and reset the billing period.`)) {
      return;
    }

    try {
      const response = await restaurantAPI.generateInvoice(restaurant.id);
      toast.success(`Invoice ${response.data.invoice_number} generated successfully!`);

      // Refresh invoices if modal is open
      if (showInvoicesModal && selectedRestaurant?.id === restaurant.id) {
        const invoicesResponse = await restaurantAPI.listInvoices(restaurant.id);
        setInvoices(invoicesResponse.data);
      }
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      toast.error('Failed to generate invoice');
    }
  };

  const stats = [
    {
      label: 'Total Restaurants',
      value: restaurants.length,
      icon: FiUsers,
      color: 'bg-blue-500',
    },
    {
      label: 'Active Restaurants',
      value: restaurants.filter((r) => r.is_active).length,
      icon: FiTrendingUp,
      color: 'bg-green-500',
    },
    {
      label: 'Restaurants with Billing',
      value: restaurants.filter((r) => r.enable_booking_fees).length,
      icon: FiDollarSign,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Logout */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Master Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage all restaurants and system settings</p>
            {user && (
              <p className="text-sm text-gray-500 mt-1">Logged in as: {user.username} ({user.email})</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
          >
            <FiLogOut />
            Logout
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                    <p className="text-4xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`${stat.color} w-16 h-16 rounded-full flex items-center justify-center`}>
                    <Icon className="text-white text-3xl" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => navigate('/master-admin/users')}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-lg p-8 transition-all transform hover:scale-105"
          >
            <FiUsers className="text-5xl mb-4" />
            <h3 className="text-2xl font-bold mb-2">Manage Users</h3>
            <p className="text-blue-100">Create users and assign them to restaurants</p>
          </button>

          <button
            onClick={handleCreate}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl shadow-lg p-8 transition-all transform hover:scale-105"
          >
            <FiPlus className="text-5xl mb-4" />
            <h3 className="text-2xl font-bold mb-2">Create Restaurant</h3>
            <p className="text-green-100">Add a new restaurant to the system</p>
          </button>
        </div>

        {/* Restaurants List */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">All Restaurants</h2>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              <FiPlus />
              Create Restaurant
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          ) : restaurants.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-2">No restaurants found</p>
              <p className="text-gray-400 text-sm">Restaurants will appear here once they are created</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Phone</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Currency</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Billing Fees</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Tables</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Subscription</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {restaurants.map((restaurant) => (
                    <tr key={restaurant.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-semibold text-gray-900">{restaurant.name}</td>
                      <td className="py-3 px-4 text-gray-600">{restaurant.email || '-'}</td>
                      <td className="py-3 px-4 text-gray-600">{restaurant.phone || '-'}</td>
                      <td className="py-3 px-4 text-gray-600">
                        <span className="font-semibold">{restaurant.currency_symbol || '$'}</span> {restaurant.currency_code || 'USD'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {restaurant.enable_booking_fees ? (
                          <div className="text-xs">
                            <div>Table: {restaurant.currency_symbol}{restaurant.per_table_booking_fee?.toFixed(2) || '0.00'}</div>
                            <div>Online: {restaurant.currency_symbol}{restaurant.per_online_booking_fee?.toFixed(2) || '0.00'}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Disabled</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            restaurant.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {restaurant.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{restaurant.max_tables || 10}</td>
                      <td className="py-3 px-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          {restaurant.pricing_plan || 'basic'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          {restaurant.enable_booking_fees && (
                            <button
                              onClick={() => handleViewInvoices(restaurant)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="View Invoices"
                            >
                              <FiFileText className="text-lg" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(restaurant)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Restaurant"
                          >
                            <FiEdit2 className="text-lg" />
                          </button>
                          <button
                            onClick={() => handleDelete(restaurant.id, restaurant.name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Restaurant"
                          >
                            <FiTrash2 className="text-lg" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingRestaurant ? 'Edit Restaurant' : 'Create New Restaurant'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX className="text-2xl text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Restaurant Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Address *
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Theme Color
                    </label>
                    <input
                      type="color"
                      name="theme_color"
                      value={formData.theme_color}
                      onChange={handleInputChange}
                      className="w-full h-10 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Max Tables *
                    </label>
                    <input
                      type="number"
                      name="max_tables"
                      value={formData.max_tables}
                      onChange={handleInputChange}
                      min="1"
                      max="100"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Country
                    </label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Object.keys(COUNTRY_CURRENCY_MAP).map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Currency
                    </label>
                    <input
                      type="text"
                      value={`${formData.currency_code} (${formData.currency_symbol})`}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                      disabled
                    />
                  </div>
                </div>

                {/* Billing Configuration */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Billing Configuration</h3>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="enable_booking_fees"
                        checked={formData.enable_booking_fees}
                        onChange={(e) => setFormData({ ...formData, enable_booking_fees: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="enable_booking_fees" className="ml-2 text-sm font-medium text-gray-700">
                        Enable Booking Fees
                      </label>
                    </div>

                    {formData.enable_booking_fees && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Per Table Booking Fee ({formData.currency_symbol})
                          </label>
                          <input
                            type="number"
                            name="per_table_booking_fee"
                            value={formData.per_table_booking_fee}
                            onChange={(e) => setFormData({ ...formData, per_table_booking_fee: parseFloat(e.target.value) || 0 })}
                            min="0"
                            step="0.01"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Per Online Booking Fee ({formData.currency_symbol})
                          </label>
                          <input
                            type="number"
                            name="per_online_booking_fee"
                            value={formData.per_online_booking_fee}
                            onChange={(e) => setFormData({ ...formData, per_online_booking_fee: parseFloat(e.target.value) || 0 })}
                            min="0"
                            step="0.01"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    {editingRestaurant ? 'Update Restaurant' : 'Create Restaurant'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Invoices Modal */}
        {showInvoicesModal && selectedRestaurant && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Invoices - {selectedRestaurant.name}</h2>
                  <p className="text-sm text-gray-600">Currency: {selectedRestaurant.currency_symbol} {selectedRestaurant.currency_code}</p>
                </div>
                <button
                  onClick={() => setShowInvoicesModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX className="text-2xl text-gray-600" />
                </button>
              </div>

              <div className="p-6">
                {/* Generate Invoice Button */}
                <div className="mb-6 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} total
                  </div>
                  <button
                    onClick={() => handleGenerateInvoice(selectedRestaurant)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    <FiPlus />
                    Generate Invoice
                  </button>
                </div>

                {/* Invoices List */}
                {loadingInvoices ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full"></div>
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg mb-2">No invoices yet</p>
                    <p className="text-gray-400 text-sm">Click "Generate Invoice" to create the first invoice</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">{invoice.invoice_number}</h3>
                            <p className="text-sm text-gray-600">
                              Period: {new Date(invoice.period_start).toLocaleDateString()} - {new Date(invoice.period_end).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">
                              {invoice.currency_symbol}{invoice.total_revenue.toFixed(2)}
                            </p>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              invoice.is_paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {invoice.is_paid ? 'Paid' : 'Unpaid'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Table Bookings:</p>
                            <p className="font-semibold">{invoice.total_table_bookings} × {invoice.currency_symbol}{invoice.per_table_booking_fee.toFixed(2)} = {invoice.currency_symbol}{invoice.table_booking_revenue.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Online Bookings:</p>
                            <p className="font-semibold">{invoice.total_online_bookings} × {invoice.currency_symbol}{invoice.per_online_booking_fee.toFixed(2)} = {invoice.currency_symbol}{invoice.online_booking_revenue.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="mt-2 text-xs text-gray-500">
                          Created: {new Date(invoice.created_at).toLocaleString()}
                          {invoice.paid_at && ` • Paid: ${new Date(invoice.paid_at).toLocaleString()}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
