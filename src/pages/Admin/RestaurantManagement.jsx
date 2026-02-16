import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { restaurantAPI, authAPI } from '../../services/api';
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

export default function RestaurantManagement() {
  const { user, updateUser } = useAuthStore();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
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
    if (user?.restaurant_id) {
      fetchRestaurant();
    } else {
      // No restaurant yet - show create form
      setLoading(false);
      setCreating(true);
    }
  }, [user]);

  const fetchRestaurant = async () => {
    try {
      const response = await restaurantAPI.get(user.restaurant_id);
      setRestaurant(response.data);
      setFormData(response.data);
    } catch (error) {
      toast.error('Failed to load restaurant details');
    } finally {
      setLoading(false);
    }
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

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const response = await restaurantAPI.create(formData);
      const newRestaurant = response.data;

      // Update user's restaurant_id in the database
      await authAPI.updateRestaurantId(newRestaurant.id);

      // Update user in local state
      updateUser({ restaurant_id: newRestaurant.id });

      toast.success('Restaurant created successfully!');

      setCreating(false);
      setRestaurant(newRestaurant);
      setFormData(newRestaurant);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create restaurant');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await restaurantAPI.update(user.restaurant_id, formData);
      toast.success('Restaurant updated successfully!');
      setEditing(false);
      fetchRestaurant();
    } catch (error) {
      toast.error('Failed to update restaurant');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Show create form if user doesn't have a restaurant
  if (creating) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Create Your Restaurant</h1>
              <p className="text-gray-600">Let's get your restaurant set up</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-8">
              <form onSubmit={handleCreate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Restaurant Name *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="My Restaurant"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                    <input
                      type="url"
                      className="input-field"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://myrestaurant.com"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      className="input-field"
                      rows="3"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of your restaurant"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="123 Main Street, City, State"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      className="input-field"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      className="input-field"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@restaurant.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Tables</label>
                    <input
                      type="number"
                      className="input-field"
                      value={formData.max_tables}
                      onChange={(e) => setFormData({ ...formData, max_tables: parseInt(e.target.value) })}
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                    <select
                      className="input-field"
                      value={formData.country}
                      onChange={(e) => handleCountryChange(e.target.value)}
                    >
                      {Object.keys(COUNTRY_CURRENCY_MAP).map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                    <input
                      type="text"
                      className="input-field bg-gray-100"
                      value={`${formData.currency_code} (${formData.currency_symbol})`}
                      disabled
                    />
                  </div>
                </div>

                {/* Billing Configuration Section */}
                <div className="pt-6 border-t">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Configuration</h3>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="enable_booking_fees"
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        checked={formData.enable_booking_fees}
                        onChange={(e) => setFormData({ ...formData, enable_booking_fees: e.target.checked })}
                      />
                      <label htmlFor="enable_booking_fees" className="ml-2 text-sm font-medium text-gray-700">
                        Enable Booking Fees
                      </label>
                    </div>

                    {formData.enable_booking_fees && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Per Table Booking Fee ({formData.currency_symbol})
                          </label>
                          <input
                            type="number"
                            className="input-field"
                            value={formData.per_table_booking_fee}
                            onChange={(e) => setFormData({ ...formData, per_table_booking_fee: parseFloat(e.target.value) || 0 })}
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Per Online Booking Fee ({formData.currency_symbol})
                          </label>
                          <input
                            type="number"
                            className="input-field"
                            value={formData.per_online_booking_fee}
                            onChange={(e) => setFormData({ ...formData, per_online_booking_fee: parseFloat(e.target.value) || 0 })}
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 pt-6 border-t">
                  <button type="submit" className="btn-primary flex-1 px-6 py-3 text-lg">
                    Create Restaurant
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Restaurant Management</h1>
          {!editing && restaurant && (
            <button onClick={() => setEditing(true)} className="btn-primary">
              Edit Details
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-8">
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Restaurant Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!editing}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cuisine Type</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.cuisine_type || ''}
                  onChange={(e) => setFormData({ ...formData, cuisine_type: e.target.value })}
                  disabled={!editing}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  className="input-field"
                  rows="3"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={!editing}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={!editing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  className="input-field"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!editing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  className="input-field"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!editing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Tables</label>
                <input
                  type="number"
                  className="input-field"
                  value={formData.max_tables || ''}
                  onChange={(e) => setFormData({ ...formData, max_tables: parseInt(e.target.value) })}
                  disabled={!editing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  className="input-field"
                  value={formData.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                  disabled={!editing}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <select
                  className="input-field"
                  value={formData.country || 'United States'}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  disabled={!editing}
                >
                  {Object.keys(COUNTRY_CURRENCY_MAP).map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <input
                  type="text"
                  className="input-field bg-gray-100"
                  value={`${formData.currency_code || 'USD'} (${formData.currency_symbol || '$'})`}
                  disabled
                />
              </div>
            </div>

            {/* Billing Configuration Section */}
            <div className="pt-6 border-t">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Configuration</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enable_booking_fees_edit"
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    checked={formData.enable_booking_fees || false}
                    onChange={(e) => setFormData({ ...formData, enable_booking_fees: e.target.checked })}
                    disabled={!editing}
                  />
                  <label htmlFor="enable_booking_fees_edit" className="ml-2 text-sm font-medium text-gray-700">
                    Enable Booking Fees
                  </label>
                </div>

                {formData.enable_booking_fees && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Per Table Booking Fee ({formData.currency_symbol || '$'})
                      </label>
                      <input
                        type="number"
                        className="input-field"
                        value={formData.per_table_booking_fee || 0}
                        onChange={(e) => setFormData({ ...formData, per_table_booking_fee: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="0.01"
                        disabled={!editing}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Per Online Booking Fee ({formData.currency_symbol || '$'})
                      </label>
                      <input
                        type="number"
                        className="input-field"
                        value={formData.per_online_booking_fee || 0}
                        onChange={(e) => setFormData({ ...formData, per_online_booking_fee: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="0.01"
                        disabled={!editing}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {editing && (
              <div className="flex gap-4 pt-6 border-t">
                <button type="submit" className="btn-primary px-6 py-3">
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setFormData(restaurant);
                  }}
                  className="btn-secondary px-6 py-3"
                >
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
