import { useState, useEffect } from 'react';
import { restaurantAPI } from '../services/api';
import useAuthStore from '../store/authStore';

/**
 * TierGate — wraps content that requires enterprise tier.
 * If restaurant is on basic tier, shows an upgrade message instead.
 *
 * Usage:
 *   <TierGate feature="Tables">
 *     <TableManagement />
 *   </TierGate>
 */
export default function TierGate({ feature, children }) {
  const { user } = useAuthStore();
  const [tier, setTier] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.restaurant_id) { setLoading(false); return; }
    restaurantAPI.get(user.restaurant_id)
      .then(r => setTier(r.data.tier || 'enterprise'))
      .catch(() => setTier('enterprise'))
      .finally(() => setLoading(false));
  }, [user?.restaurant_id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );

  if (tier === 'basic') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{feature} — Enterprise Feature</h2>
          <p className="text-gray-600 mb-4">
            This feature is not included in your current Basic plan.
            Contact your administrator to upgrade to Enterprise and unlock full access.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
            <p className="text-sm font-semibold text-amber-800 mb-2">Basic plan includes:</p>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>✅ Menu Management</li>
              <li>✅ Order Management</li>
              <li>✅ Staff Management</li>
              <li>✅ Feedback & Analytics</li>
              <li>✅ Inventory Management</li>
              <li className="text-gray-400">❌ Table Management</li>
              <li className="text-gray-400">❌ Delivery Integration</li>
              <li className="text-gray-400">❌ Demand Predictions</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
