/**
 * Customer Insights Dashboard
 * Customer preference tracking and personalized recommendations
 */
import React, { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PopularItemsChart } from '../../components/charts';

const CustomerInsights = () => {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [customerData, setCustomerData] = useState(null);
  const [error, setError] = useState(null);

  // Get restaurant ID from context/auth (placeholder)
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const restaurantId = user.restaurant_id || 'your-restaurant-id';

  // Search for customer
  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      setError('Please enter a customer email, phone, or ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v1/restaurants/${restaurantId}/analytics/customer-preferences/${encodeURIComponent(searchQuery)}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Customer not found');
        }
        throw new Error('Failed to fetch customer data');
      }

      const data = await response.json();
      setCustomerData(data);
    } catch (error) {
      console.error('Error fetching customer insights:', error);
      setError(error.message);
      setCustomerData(null);
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Format date
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Customer Insights</h1>
        <p className="text-gray-600 mt-1">
          Track customer preferences and view personalized recommendations
        </p>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <form onSubmit={handleSearch}>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Customer
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter email, phone, or customer ID"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-7 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Customer Data Display */}
      {customerData && (
        <>
          {/* Customer Summary */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {customerData.customer_identifier}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Customer Profile & Ordering History
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {customerData.total_orders} Total Orders
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">
                  {customerData.total_orders}
                </p>
                <p className="text-sm text-gray-600 mt-1">Total Orders</p>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(customerData.total_spent)}
                </p>
                <p className="text-sm text-gray-600 mt-1">Total Spent</p>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-3xl font-bold text-purple-600">
                  {formatCurrency(customerData.total_spent / (customerData.total_orders || 1))}
                </p>
                <p className="text-sm text-gray-600 mt-1">Avg Order Value</p>
              </div>

              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <p className="text-3xl font-bold text-amber-600">
                  {customerData.preferences?.length || 0}
                </p>
                <p className="text-sm text-gray-600 mt-1">Favorite Items</p>
              </div>
            </div>
          </div>

          {/* Favorite Items */}
          {customerData.preferences && customerData.preferences.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Favorite Items
              </h3>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Times Ordered</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Ordered</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {customerData.preferences.map((pref) => (
                      <tr key={pref.menu_item_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                              </svg>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{pref.item_name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{pref.order_count}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{pref.total_quantity}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(pref.total_spent)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(pref.last_ordered_at)}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center">
                            <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${Math.min(pref.frequency_score * 10, 100)}%` }}
                              />
                            </div>
                            <span className="text-gray-600">{pref.frequency_score.toFixed(1)}/mo</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Personalized Recommendations */}
          {customerData.recommendations && customerData.recommendations.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Personalized Recommendations
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    AI-powered suggestions based on ordering history
                  </p>
                </div>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  ML-Powered
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customerData.recommendations.map((rec) => (
                  <div
                    key={rec.menu_item_id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{rec.item_name}</h4>
                      </div>
                      <div className="ml-2">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${rec.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{(rec.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">{rec.reason}</p>

                    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">
                      Suggest This Item
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State for Recommendations */}
          {(!customerData.recommendations || customerData.recommendations.length === 0) && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Recommendations Available</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Customer needs more order history for personalized recommendations
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Initial Empty State */}
      {!customerData && !loading && !error && (
        <div className="bg-white rounded-lg shadow p-12">
          <div className="text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Search for a Customer</h3>
            <p className="mt-2 text-sm text-gray-500">
              Enter a customer's email, phone number, or ID to view their preferences and recommendations
            </p>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
};

export default CustomerInsights;
