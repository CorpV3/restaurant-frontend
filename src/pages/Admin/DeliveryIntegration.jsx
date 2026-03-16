import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { restaurantAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const PLATFORMS = [
  {
    key: 'uber',
    name: 'Uber Eats',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Uber_Eats_2020_logo.svg/200px-Uber_Eats_2020_logo.svg.png',
    color: 'bg-black',
    textColor: 'text-white',
    borderColor: 'border-gray-800',
    enabledKey: 'uber_enabled',
    idKey: 'uber_store_id',
    idLabel: 'Uber Store ID',
    idPlaceholder: 'e.g. abc123-def-456-ghi-789',
    helpText: 'Find your Store ID in Uber Eats Manager → merchants.uber.com → Settings → Store Info',
    docsUrl: 'https://developer.uber.com/docs/eats',
  },
  {
    key: 'justeat',
    name: 'Just Eat',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/thirty/Just_Eat_logo.svg/200px-Just_Eat_logo.svg.png',
    color: 'bg-orange-500',
    textColor: 'text-white',
    borderColor: 'border-orange-400',
    enabledKey: 'justeat_enabled',
    idKey: 'justeat_restaurant_id',
    idLabel: 'Just Eat Restaurant ID',
    idPlaceholder: 'e.g. uk-12345',
    helpText: 'Find your Restaurant ID in Just Eat Partner Centre → Restaurant Details',
    docsUrl: 'https://developers.just-eat.com',
  },
  {
    key: 'deliveroo',
    name: 'Deliveroo',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/2/29/Deliveroo_logo.svg/200px-Deliveroo_logo.svg.png',
    color: 'bg-teal-500',
    textColor: 'text-white',
    borderColor: 'border-teal-400',
    enabledKey: 'deliveroo_enabled',
    idKey: 'deliveroo_restaurant_id',
    idLabel: 'Deliveroo Restaurant ID',
    idPlaceholder: 'e.g. deliveroo-res-12345',
    helpText: 'Find your Restaurant ID in Deliveroo Restaurant Hub → Account Settings',
    docsUrl: 'https://developers.deliveroo.com',
  },
];

export default function DeliveryIntegration() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restaurant, setRestaurant] = useState(null);
  const [form, setForm] = useState({
    uber_enabled: false,
    uber_store_id: '',
    justeat_enabled: false,
    justeat_restaurant_id: '',
    deliveroo_enabled: false,
    deliveroo_restaurant_id: '',
  });

  useEffect(() => {
    if (user?.restaurant_id) fetchRestaurant();
    else setLoading(false);
  }, [user]);

  const fetchRestaurant = async () => {
    try {
      const res = await restaurantAPI.get(user.restaurant_id);
      setRestaurant(res.data);
      setForm({
        uber_enabled: res.data.uber_enabled || false,
        uber_store_id: res.data.uber_store_id || '',
        justeat_enabled: res.data.justeat_enabled || false,
        justeat_restaurant_id: res.data.justeat_restaurant_id || '',
        deliveroo_enabled: res.data.deliveroo_enabled || false,
        deliveroo_restaurant_id: res.data.deliveroo_restaurant_id || '',
      });
    } catch {
      toast.error('Failed to load restaurant');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (enabledKey) => {
    setForm(prev => ({ ...prev, [enabledKey]: !prev[enabledKey] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await restaurantAPI.update(user.restaurant_id, form);
      toast.success('Delivery integrations saved!');
      fetchRestaurant();
    } catch {
      toast.error('Failed to save integrations');
    } finally {
      setSaving(false);
    }
  };

  const webhookUrl = `https://testenv.corpv3.com/api/v1/webhooks/uber-eats`;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user?.restaurant_id) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-gray-500">
          <p>No restaurant found. Please create a restaurant first.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Delivery Integrations</h1>
          <p className="text-gray-500 mt-1">Connect your restaurant to third-party delivery platforms</p>
        </div>

        {/* Webhook Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-8">
          <p className="text-sm font-semibold text-blue-800 mb-1">Your Webhook URL (use this in all delivery portals)</p>
          <div className="flex items-center gap-3 mt-2">
            <code className="flex-1 bg-white border border-blue-200 rounded-lg px-4 py-2 text-sm font-mono text-blue-900 break-all">
              {webhookUrl}
            </code>
            <button
              onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied!'); }}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium whitespace-nowrap"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Platform Cards */}
        <div className="space-y-6">
          {PLATFORMS.map((platform) => {
            const isEnabled = form[platform.enabledKey];
            return (
              <div
                key={platform.key}
                className={`bg-white rounded-xl shadow-md border-2 transition-all ${isEnabled ? platform.borderColor : 'border-gray-200'}`}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${platform.color} flex items-center justify-center font-bold ${platform.textColor} text-lg`}>
                      {platform.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{platform.name}</h3>
                      <p className="text-sm text-gray-500">
                        {isEnabled ? (
                          <span className="text-green-600 font-medium">● Connected</span>
                        ) : (
                          <span className="text-gray-400">○ Not connected</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(platform.enabledKey)}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${
                      isEnabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        isEnabled ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Body — only show when enabled */}
                {isEnabled && (
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        {platform.idLabel}
                      </label>
                      <input
                        type="text"
                        value={form[platform.idKey]}
                        onChange={(e) => setForm(prev => ({ ...prev, [platform.idKey]: e.target.value }))}
                        placeholder={platform.idPlaceholder}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">{platform.helpText}</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Webhook Setup in {platform.name} Portal:</p>
                      <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                        <li>Go to your {platform.name} developer/partner portal</li>
                        <li>Navigate to Webhooks settings</li>
                        <li>Add the webhook URL above</li>
                        <li>Subscribe to <code className="bg-gray-200 px-1 rounded">orders.notification</code> event</li>
                      </ol>
                      <a
                        href={platform.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                      >
                        View {platform.name} Docs →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save Integrations'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
