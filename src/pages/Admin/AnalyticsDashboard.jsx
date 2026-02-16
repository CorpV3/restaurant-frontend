/**
 * Analytics Dashboard
 * Comprehensive sales analytics dashboard with 8 sections
 */
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DateRangePicker from '../../components/DateRangePicker';
import {
  RevenueChart,
  PopularItemsChart,
  CategoryPieChart,
  HeatmapChart,
  TrendLineChart,
  ComparisonChart,
  GaugeChart
} from '../../components/charts';

const AnalyticsDashboard = () => {
  // State management
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: getDefaultStartDate(),
    end: getDefaultEndDate()
  });
  const [showComparison, setShowComparison] = useState(false);
  const [groupBy, setGroupBy] = useState('daily');

  // Analytics data state
  const [revenueData, setRevenueData] = useState(null);
  const [popularItems, setPopularItems] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [peakHours, setPeakHours] = useState(null);
  const [orderVolume, setOrderVolume] = useState(null);
  const [salesComparison, setSalesComparison] = useState(null);
  const [topPerformers, setTopPerformers] = useState([]);
  const [orderTypeBreakdown, setOrderTypeBreakdown] = useState([]);
  const [customerBehavior, setCustomerBehavior] = useState(null);

  // Get restaurant ID from authenticated user
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const restaurantId = user.restaurant_id || 'your-restaurant-id';

  // Default date range (last 30 days)
  function getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  }

  function getDefaultEndDate() {
    return new Date().toISOString().split('T')[0];
  }

  // Fetch all analytics data
  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, groupBy]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchRevenueAnalytics(),
        fetchPopularItems(),
        fetchCategoryPerformance(),
        fetchPeakHours(),
        fetchOrderVolume(),
        fetchSalesComparison(),
        fetchTopPerformers(),
        fetchOrderTypeBreakdown(),
        fetchCustomerBehavior()
      ]);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // API calls
  const fetchRevenueAnalytics = async () => {
    try {
      const response = await fetch(
        `/api/v1/restaurants/${restaurantId}/analytics/revenue?` +
        `start_date=${dateRange.start}&end_date=${dateRange.end}&group_by=${groupBy}`
      );
      const data = await response.json();
      setRevenueData(data);
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
    }
  };

  const fetchPopularItems = async () => {
    try {
      const days = Math.ceil((new Date(dateRange.end) - new Date(dateRange.start)) / (1000 * 60 * 60 * 24));
      const response = await fetch(
        `/api/v1/restaurants/${restaurantId}/analytics/popular-items?days=${days}&limit=10`
      );
      const data = await response.json();
      setPopularItems(data.items || []);
    } catch (error) {
      console.error('Error fetching popular items:', error);
    }
  };

  const fetchCategoryPerformance = async () => {
    try {
      const response = await fetch(
        `/api/v1/restaurants/${restaurantId}/analytics/category-performance?` +
        `start_date=${dateRange.start}&end_date=${dateRange.end}`
      );
      const data = await response.json();
      setCategoryData(data.categories || []);
    } catch (error) {
      console.error('Error fetching category performance:', error);
    }
  };

  const fetchPeakHours = async () => {
    try {
      const response = await fetch(
        `/api/v1/restaurants/${restaurantId}/analytics/peak-hours?` +
        `start_date=${dateRange.start}&end_date=${dateRange.end}`
      );
      const data = await response.json();
      setPeakHours(data);
    } catch (error) {
      console.error('Error fetching peak hours:', error);
    }
  };

  const fetchOrderVolume = async () => {
    try {
      const response = await fetch(
        `/api/v1/restaurants/${restaurantId}/analytics/order-volume?` +
        `start_date=${dateRange.start}&end_date=${dateRange.end}&group_by=${groupBy}`
      );
      const data = await response.json();
      setOrderVolume(data);
    } catch (error) {
      console.error('Error fetching order volume:', error);
    }
  };

  const fetchSalesComparison = async () => {
    try {
      const response = await fetch(
        `/api/v1/restaurants/${restaurantId}/analytics/sales-comparison?period=week`
      );
      const data = await response.json();
      setSalesComparison(data);
    } catch (error) {
      console.error('Error fetching sales comparison:', error);
    }
  };

  const fetchTopPerformers = async () => {
    try {
      const response = await fetch(
        `/api/v1/restaurants/${restaurantId}/analytics/top-performers?` +
        `start_date=${dateRange.start}&end_date=${dateRange.end}&rank_by=revenue&limit=20`
      );
      const data = await response.json();
      setTopPerformers(data.items || []);
    } catch (error) {
      console.error('Error fetching top performers:', error);
    }
  };

  const fetchOrderTypeBreakdown = async () => {
    try {
      const response = await fetch(
        `/api/v1/restaurants/${restaurantId}/analytics/order-type-breakdown?` +
        `start_date=${dateRange.start}&end_date=${dateRange.end}`
      );
      const data = await response.json();
      setOrderTypeBreakdown(data.breakdown || []);
    } catch (error) {
      console.error('Error fetching order type breakdown:', error);
    }
  };

  const fetchCustomerBehavior = async () => {
    try {
      const response = await fetch(
        `/api/v1/restaurants/${restaurantId}/analytics/customer-behavior?` +
        `start_date=${dateRange.start}&end_date=${dateRange.end}`
      );
      const data = await response.json();
      setCustomerBehavior(data);
    } catch (error) {
      console.error('Error fetching customer behavior:', error);
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

  // Handle date change
  const handleDateChange = (start, end) => {
    setDateRange({ start, end });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Sales Analytics</h1>
        <p className="text-gray-600 mt-1">Comprehensive sales insights and performance metrics</p>
      </div>

      {/* Date Range Picker */}
      <div className="mb-6">
        <DateRangePicker
          startDate={dateRange.start}
          endDate={dateRange.end}
          onDateChange={handleDateChange}
          showComparison={showComparison}
          onComparisonToggle={setShowComparison}
        />
      </div>

      {/* Section 1: Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {revenueData ? formatCurrency(revenueData.total_revenue) : '$0'}
              </p>
              {salesComparison && (
                <p className={`text-sm mt-1 ${
                  salesComparison.revenue_growth_percentage > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {salesComparison.revenue_growth_percentage > 0 ? '+' : ''}
                  {salesComparison.revenue_growth_percentage?.toFixed(1)}% vs previous
                </p>
              )}
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {revenueData?.total_orders || 0}
              </p>
              {salesComparison && (
                <p className={`text-sm mt-1 ${
                  salesComparison.orders_growth_percentage > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {salesComparison.orders_growth_percentage > 0 ? '+' : ''}
                  {salesComparison.orders_growth_percentage?.toFixed(1)}% vs previous
                </p>
              )}
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {revenueData ? formatCurrency(revenueData.overall_avg_order_value) : '$0'}
              </p>
              {salesComparison && salesComparison.current_avg_order_value && (
                <p className="text-sm mt-1 text-gray-600">
                  Previous: {formatCurrency(salesComparison.previous_avg_order_value)}
                </p>
              )}
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Top Selling Item</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {popularItems[0]?.item_name || 'N/A'}
              </p>
              {popularItems[0] && (
                <p className="text-sm mt-1 text-gray-600">
                  {popularItems[0].quantity_sold} sold
                </p>
              )}
            </div>
            <div className="p-3 bg-amber-100 rounded-full">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Revenue Trends Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Revenue Trends</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setGroupBy('daily')}
              className={`px-3 py-1 rounded text-sm ${
                groupBy === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setGroupBy('weekly')}
              className={`px-3 py-1 rounded text-sm ${
                groupBy === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setGroupBy('monthly')}
              className={`px-3 py-1 rounded text-sm ${
                groupBy === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
        {revenueData?.metrics && (
          <RevenueChart data={revenueData.metrics} showComparison={showComparison} />
        )}
      </div>

      {/* Section 3: Sales by Category & Order Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Sales by Category</h2>
          {categoryData.length > 0 ? (
            <CategoryPieChart data={categoryData} />
          ) : (
            <p className="text-center text-gray-500 py-8">No category data available</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Type Breakdown</h2>
          {orderTypeBreakdown.length > 0 ? (
            <CategoryPieChart data={orderTypeBreakdown.map(item => ({
              category: item.order_type,
              revenue: item.revenue,
              order_count: item.order_count
            }))} />
          ) : (
            <p className="text-center text-gray-500 py-8">No order type data available</p>
          )}
        </div>
      </div>

      {/* Section 4: Top Performing Items */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Top 10 Performing Items</h2>
        {popularItems.length > 0 ? (
          <PopularItemsChart data={popularItems} rankBy="revenue" maxItems={10} />
        ) : (
          <p className="text-center text-gray-500 py-8">No items data available</p>
        )}
      </div>

      {/* Section 5: Peak Hours Heatmap */}
      {peakHours?.hourly_metrics && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Peak Hours Analysis</h2>
          <p className="text-sm text-gray-600 mb-4">
            Busiest Hour: <span className="font-medium">{peakHours.busiest_hour}:00</span> |
            Slowest Hour: <span className="font-medium">{peakHours.slowest_hour}:00</span>
          </p>
          {/* Note: HeatmapChart would need day×hour data - using placeholder for now */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Hour</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Avg Orders</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Avg Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {peakHours.hourly_metrics.map((metric) => (
                  <tr key={metric.hour}>
                    <td className="px-4 py-2 text-sm text-gray-900">{metric.hour}:00</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{metric.avg_orders.toFixed(1)}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{formatCurrency(metric.avg_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 6: Sales Comparison */}
      {salesComparison && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Sales Comparison</h2>
          <ComparisonChart
            currentData={salesComparison}
            metrics={['revenue', 'orders', 'avg_order_value']}
          />
        </div>
      )}

      {/* Section 7: Customer Behavior Metrics */}
      {customerBehavior && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Customer Behavior</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{customerBehavior.new_customers}</p>
              <p className="text-sm text-gray-600 mt-1">New Customers</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{customerBehavior.returning_customers}</p>
              <p className="text-sm text-gray-600 mt-1">Returning Customers</p>
            </div>
            <div className="text-center">
              <GaugeChart
                value={customerBehavior.repeat_rate}
                title="Repeat Rate"
                unit="%"
                size={180}
              />
            </div>
          </div>
        </div>
      )}

      {/* Section 8: Detailed Top Performers Table */}
      {topPerformers.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Detailed Performance Report</h2>
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topPerformers.map((item) => (
                  <tr key={item.menu_item_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">#{item.rank}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.item_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{item.category.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{formatCurrency(item.revenue)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.quantity_sold}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.order_count}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        item.trend === 'up' ? 'bg-green-100 text-green-800' :
                        item.trend === 'down' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '→'}
                        {item.trend_percentage !== null && ` ${Math.abs(item.trend_percentage)}%`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
};

export default AnalyticsDashboard;
