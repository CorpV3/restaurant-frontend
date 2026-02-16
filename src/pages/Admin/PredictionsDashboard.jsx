/**
 * Predictions Dashboard
 * Strategic planning dashboard with ML-powered demand forecasting
 */
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PeriodSelector from '../../components/PeriodSelector';
import { TrendLineChart, PopularItemsChart } from '../../components/charts';

const PredictionsDashboard = () => {
  // State management
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('2_weeks');
  const [predictions, setPredictions] = useState(null);
  const [availableDays, setAvailableDays] = useState(0);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('calendar'); // calendar, chart, table

  // Get restaurant ID from context/auth (placeholder)
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const restaurantId = user.restaurant_id || 'your-restaurant-id';

  // Fetch available data on mount
  useEffect(() => {
    checkDataAvailability();
  }, []);

  // Fetch predictions when period changes
  useEffect(() => {
    if (availableDays > 0) {
      fetchPredictions();
    }
  }, [selectedPeriod]);

  // Check data availability
  const checkDataAvailability = async () => {
    try {
      // This endpoint should return available days of data
      // For now, we'll simulate it
      setAvailableDays(120); // Placeholder - needs actual API endpoint
    } catch (error) {
      console.error('Error checking data availability:', error);
    }
  };

  // Fetch ML predictions
  const fetchPredictions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v1/restaurants/${restaurantId}/analytics/predictions/demand?period=${selectedPeriod}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch predictions');
      }

      const data = await response.json();
      setPredictions(data);
    } catch (error) {
      console.error('Error fetching predictions:', error);
      setError(error.message);

      // Handle specific error cases
      if (error.message.includes('INSUFFICIENT_DATA')) {
        setError('Not enough historical data for this prediction period');
      }
    } finally {
      setLoading(false);
    }
  };

  // Group predictions by date
  const getPredictionsByDate = () => {
    if (!predictions?.predictions) return {};

    const grouped = {};
    predictions.predictions.forEach(pred => {
      if (!grouped[pred.date]) {
        grouped[pred.date] = [];
      }
      grouped[pred.date].push(pred);
    });

    return grouped;
  };

  // Get top items for a specific date
  const getTopItemsForDate = (date) => {
    const grouped = getPredictionsByDate();
    const items = grouped[date] || [];
    return items.sort((a, b) => b.predicted_quantity - a.predicted_quantity).slice(0, 10);
  };

  // Get all unique dates
  const getDates = () => {
    if (!predictions?.predictions) return [];
    const dates = [...new Set(predictions.predictions.map(p => p.date))];
    return dates.sort();
  };

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get day of week
  const getDayOfWeek = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  // Render loading state
  if (loading && !predictions) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg font-medium text-gray-700">Training ML model...</p>
          <p className="mt-2 text-sm text-gray-500">
            This may take 10-90 seconds for first-time predictions
          </p>
          <div className="mt-4 max-w-md mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <p className="text-sm text-blue-700">
                The system is analyzing your order history using Facebook Prophet ML
                to generate accurate demand forecasts. Subsequent requests will be instant (under 100ms).
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Demand Predictions</h1>
        <p className="text-gray-600 mt-1">
          ML-powered forecasting for strategic planning and inventory management
        </p>
      </div>

      {/* Period Selector */}
      <div className="mb-6">
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          availableDays={availableDays}
          disabled={loading}
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading predictions</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={fetchPredictions}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Predictions Display */}
      {predictions && !error && (
        <>
          {/* View Mode Selector */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {predictions.days_ahead}-Day Forecast
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {predictions.predictions.length} predictions generated
                  {predictions.cached && <span className="text-green-600 ml-2">(Cached ⚡)</span>}
                </p>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-4 py-2 rounded text-sm font-medium ${
                    viewMode === 'calendar'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Calendar View
                </button>
                <button
                  onClick={() => setViewMode('chart')}
                  className={`px-4 py-2 rounded text-sm font-medium ${
                    viewMode === 'chart'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Chart View
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-2 rounded text-sm font-medium ${
                    viewMode === 'table'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Table View
                </button>
              </div>
            </div>
          </div>

          {/* Calendar View */}
          {viewMode === 'calendar' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {getDates().map(date => {
                const topItems = getTopItemsForDate(date);
                return (
                  <div key={date} className="bg-white rounded-lg shadow p-6">
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-900">{getDayOfWeek(date)}</h3>
                      <p className="text-sm text-gray-600">{formatDate(date)}</p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700">Top Items to Prepare:</h4>
                      {topItems.slice(0, 5).map((item, idx) => (
                        <div key={item.menu_item_id} className="flex items-start">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">
                            {idx + 1}
                          </span>
                          <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-gray-900">{item.item_name}</p>
                            <div className="flex items-center mt-1">
                              <p className="text-sm text-gray-600">
                                {item.predicted_quantity} units
                              </p>
                              <span className="mx-2 text-gray-400">|</span>
                              <p className="text-xs text-gray-500">
                                {item.confidence_lower}-{item.confidence_upper}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Chart View */}
          {viewMode === 'chart' && (
            <div className="space-y-6">
              {/* Get unique items */}
              {(() => {
                const itemsMap = new Map();
                predictions.predictions.forEach(pred => {
                  if (!itemsMap.has(pred.menu_item_id)) {
                    itemsMap.set(pred.menu_item_id, {
                      id: pred.menu_item_id,
                      name: pred.item_name,
                      data: []
                    });
                  }
                  itemsMap.get(pred.menu_item_id).data.push({
                    period: pred.date,
                    value: pred.predicted_quantity,
                    confidence_upper: pred.confidence_upper,
                    confidence_lower: pred.confidence_lower
                  });
                });

                return Array.from(itemsMap.values()).slice(0, 10).map(item => (
                  <div key={item.id} className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{item.name}</h3>
                    <TrendLineChart
                      data={item.data}
                      dataKey="value"
                      name="Predicted Demand"
                      showConfidenceBands={true}
                      showTrendLine={true}
                      height={300}
                    />
                  </div>
                ));
              })()}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Predicted Qty</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence Range</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {predictions.predictions.map((pred, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{pred.date}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{getDayOfWeek(pred.date)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{pred.item_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{pred.predicted_quantity}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {pred.confidence_lower} - {pred.confidence_upper}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${pred.confidence_level * 100}%` }}
                              />
                            </div>
                            <span className="text-gray-600">{(pred.confidence_level * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Export Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                // Implement CSV export
                const csv = 'data:text/csv;charset=utf-8,' +
                  'Date,Day,Item,Predicted Quantity,Confidence Lower,Confidence Upper\n' +
                  predictions.predictions.map(p =>
                    `${p.date},${getDayOfWeek(p.date)},${p.item_name},${p.predicted_quantity},${p.confidence_lower},${p.confidence_upper}`
                  ).join('\n');
                const link = document.createElement('a');
                link.href = encodeURI(csv);
                link.download = `predictions_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`;
                link.click();
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow"
            >
              Export Predictions (CSV)
            </button>
          </div>
        </>
      )}
    </div>
    </DashboardLayout>
  );
};

export default PredictionsDashboard;
