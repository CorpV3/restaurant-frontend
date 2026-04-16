import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { integrationAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const PLATFORMS = [
  {
    id: 'uber_eats',
    name: 'Uber Eats',
    logo: '🟠',
    description: 'Connect your restaurant to Uber Eats to receive orders directly.',
    storeIdLabel: 'Uber Eats Store UUID',
    storeIdPlaceholder: 'e.g. f1a2b3c4-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    helpText: 'Find your Store UUID in the Uber Eats Restaurant Manager → Settings → Store Information.',
  },
  {
    id: 'just_eat',
    name: 'Just Eat',
    logo: '🟠',
    description: 'Receive Just Eat orders directly into your kitchen.',
    storeIdLabel: 'Just Eat Restaurant ID',
    storeIdPlaceholder: 'e.g. 12345',
    helpText: 'Find your Restaurant ID in the Just Eat Partner Centre → Account Settings.',
  },
  {
    id: 'deliveroo',
    name: 'Deliveroo',
    logo: '🟦',
    description: 'Connect to Deliveroo to manage orders in real-time.',
    storeIdLabel: 'Deliveroo Site ID',
    storeIdPlaceholder: 'e.g. site_xxxxxxxx',
    helpText: 'Find your Site ID in the Deliveroo Restaurant Hub → Integrations.',
  },
];

export default function DeliveryIntegration() {
  const { user } = useAuthStore();
  const restaurantId = user?.restaurant_id;

  const [integrations, setIntegrations] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [storeIds, setStoreIds] = useState({ uber_eats: '', just_eat: '', deliveroo: '' });

  useEffect(() => {
    if (restaurantId) fetchIntegrations();
  }, [restaurantId]);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const res = await integrationAPI.list(restaurantId);
      const map = {};
      const ids = { uber_eats: '', just_eat: '', deliveroo: '' };
      for (const item of res.data) {
        map[item.platform] = item;
        ids[item.platform] = item.external_store_id;
      }
      setIntegrations(map);
      setStoreIds(ids);
    } catch {
      toast.error('Failed to load delivery integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (platformId) => {
    const storeId = storeIds[platformId]?.trim();
    if (!storeId) {
      toast.error('Please enter a Store ID');
      return;
    }
    setSaving((s) => ({ ...s, [platformId]: true }));
    try {
      const res = await integrationAPI.upsert({
        restaurant_id: restaurantId,
        platform: platformId,
        external_store_id: storeId,
        is_active: true,
      });
      setIntegrations((prev) => ({ ...prev, [platformId]: res.data }));
      toast.success('Integration saved successfully');
    } catch {
      toast.error('Failed to save integration');
    } finally {
      setSaving((s) => ({ ...s, [platformId]: false }));
    }
  };

  const handleToggle = async (platformId) => {
    const existing = integrations[platformId];
    if (!existing) return;
    setSaving((s) => ({ ...s, [platformId]: true }));
    try {
      const res = await integrationAPI.toggle(existing.id);
      setIntegrations((prev) => ({ ...prev, [platformId]: res.data }));
      toast.success(res.data.is_active ? 'Integration enabled' : 'Integration paused');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setSaving((s) => ({ ...s, [platformId]: false }));
    }
  };

  const handleDisconnect = async (platformId) => {
    const existing = integrations[platformId];
    if (!existing) return;
    if (!window.confirm(`Disconnect ${platformId.replace('_', ' ')}? This will stop receiving orders from this platform.`)) return;
    setSaving((s) => ({ ...s, [platformId]: true }));
    try {
      await integrationAPI.remove(existing.id);
      setIntegrations((prev) => {
        const next = { ...prev };
        delete next[platformId];
        return next;
      });
      setStoreIds((prev) => ({ ...prev, [platformId]: '' }));
      toast.success('Integration disconnected');
    } catch {
      toast.error('Failed to disconnect');
    } finally {
      setSaving((s) => ({ ...s, [platformId]: false }));
    }
  };

  if (!restaurantId) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-gray-500">
          Please set up your restaurant first before configuring delivery integrations.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Delivery Integrations</h1>
          <p className="text-gray-500 mt-1">
            Connect your restaurant to third-party delivery platforms to receive and manage orders automatically.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading integrations…</div>
        ) : (
          <div className="space-y-6">
            {PLATFORMS.map((platform) => {
              const existing = integrations[platform.id];
              const isConnected = !!existing;
              const isActive = existing?.is_active;
              const isSaving = !!saving[platform.id];
              const webhookUrl = existing?.webhook_url || `https://restaurant.corpv3.com/api/v1/webhooks/${platform.id.replace('_', '-')}`;

              return (
                <div key={platform.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{platform.logo}</span>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">{platform.name}</h2>
                        <p className="text-sm text-gray-500">{platform.description}</p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-medium px-3 py-1 rounded-full ${
                        isConnected && isActive
                          ? 'bg-green-100 text-green-700'
                          : isConnected
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {isConnected && isActive ? 'Active' : isConnected ? 'Paused' : 'Not Connected'}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Store ID input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {platform.storeIdLabel}
                      </label>
                      <input
                        type="text"
                        value={storeIds[platform.id]}
                        onChange={(e) =>
                          setStoreIds((prev) => ({ ...prev, [platform.id]: e.target.value }))
                        }
                        placeholder={platform.storeIdPlaceholder}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-400 mt-1">{platform.helpText}</p>
                    </div>

                    {/* Webhook URL (read-only, for copy) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Webhook URL <span className="text-gray-400 font-normal">(configure this in the platform portal)</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={webhookUrl}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600 font-mono"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(webhookUrl);
                            toast.success('Copied!');
                          }}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => handleSave(platform.id)}
                        disabled={isSaving}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSaving ? 'Saving…' : isConnected ? 'Update' : 'Connect'}
                      </button>

                      {isConnected && (
                        <>
                          <button
                            onClick={() => handleToggle(platform.id)}
                            disabled={isSaving}
                            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 text-gray-700"
                          >
                            {isActive ? 'Pause' : 'Resume'}
                          </button>
                          <button
                            onClick={() => handleDisconnect(platform.id)}
                            disabled={isSaving}
                            className="px-4 py-2 border border-red-300 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 text-red-600"
                          >
                            Disconnect
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
