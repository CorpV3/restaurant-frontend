import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { restaurantAPI, tableAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function QRScanLanding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [restaurantInfo, setRestaurantInfo] = useState(null);
  const [tableInfo, setTableInfo] = useState(null);

  useEffect(() => {
    validateAndLoadData();
  }, []);

  const validateAndLoadData = async () => {
    try {
      // Get parameters from QR code URL
      const restaurantId = searchParams.get('restaurant');
      const tableId = searchParams.get('table');
      const token = searchParams.get('token');

      if (!restaurantId || !tableId) {
        toast.error('Invalid QR code. Please scan again.');
        return;
      }

      // Fetch restaurant and table information
      const [restaurantResponse, tableResponse] = await Promise.all([
        restaurantAPI.getById(restaurantId),
        tableAPI.getById(restaurantId, tableId),
      ]);

      setRestaurantInfo(restaurantResponse.data);
      setTableInfo(tableResponse.data);

      // Store in session for the order flow
      sessionStorage.setItem('currentTable', JSON.stringify({
        restaurantId,
        tableId,
        tableNumber: tableResponse.data.table_number,
        token,
      }));

      setLoading(false);
    } catch (error) {
      console.error('Error loading QR data:', error);
      toast.error('Failed to load restaurant information');
      setLoading(false);
    }
  };

  const handleStartOrdering = () => {
    const restaurantId = searchParams.get('restaurant');
    navigate(`/menu/${restaurantId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-16 w-16 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading restaurant information...</p>
        </div>
      </div>
    );
  }

  if (!restaurantInfo || !tableInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid QR Code</h1>
          <p className="text-gray-600 mb-6">
            This QR code appears to be invalid or expired. Please scan a valid restaurant table QR code.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        {/* Welcome Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🍽️</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to {restaurantInfo.name}!
          </h1>
          <p className="text-gray-600 text-lg">
            {restaurantInfo.description || 'Enjoy our delicious menu'}
          </p>
        </div>

        {/* Table Information */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">You're seated at</p>
              <h2 className="text-3xl font-bold text-gray-900">
                Table {tableInfo.table_number}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Capacity</p>
              <p className="text-2xl font-bold text-blue-600">
                {tableInfo.seat_count} seats
              </p>
            </div>
          </div>
          {tableInfo.floor && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                📍 {tableInfo.floor} {tableInfo.section && `• ${tableInfo.section}`}
              </p>
            </div>
          )}
        </div>

        {/* Restaurant Details */}
        <div className="space-y-4 mb-8">
          {restaurantInfo.cuisine_type && (
            <div className="flex items-center gap-3">
              <span className="text-2xl">🍴</span>
              <div>
                <p className="text-sm text-gray-600">Cuisine</p>
                <p className="font-semibold text-gray-900">{restaurantInfo.cuisine_type}</p>
              </div>
            </div>
          )}
          {restaurantInfo.address && (
            <div className="flex items-center gap-3">
              <span className="text-2xl">📍</span>
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-semibold text-gray-900">{restaurantInfo.address}</p>
              </div>
            </div>
          )}
          {restaurantInfo.phone && (
            <div className="flex items-center gap-3">
              <span className="text-2xl">📞</span>
              <div>
                <p className="text-sm text-gray-600">Contact</p>
                <p className="font-semibold text-gray-900">{restaurantInfo.phone}</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleStartOrdering}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
          >
            🍽️ View Menu & Start Ordering
          </button>

          <button
            onClick={() => navigate('/customer/orders')}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            📋 View My Orders
          </button>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">💡 Tip:</span> You can order multiple items,
            split the bill with friends, and track your order status in real-time!
          </p>
        </div>
      </div>
    </div>
  );
}
