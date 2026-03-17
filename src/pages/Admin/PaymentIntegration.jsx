import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { restaurantAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const PROVIDERS = [
  {
    key: 'tripos',
    name: 'Worldpay triPOS',
    description: 'Physical card terminal (chip & tap)',
    color: 'bg-red-600',
    textColor: 'text-white',
    borderColor: 'border-red-500',
    enabledKey: 'tripos_enabled',
    fields: [
      { key: 'tripos_acceptor_id', label: 'Acceptor ID', placeholder: 'e.g. 364809056', type: 'text' },
      { key: 'tripos_account_id', label: 'Account ID', placeholder: 'e.g. 1335328', type: 'text' },
      { key: 'tripos_account_token', label: 'Account Token', placeholder: 'Your account token', type: 'password' },
      { key: 'tripos_application_id', label: 'Application ID', placeholder: 'e.g. 22820', type: 'text' },
      { key: 'tripos_lane_id', label: 'Lane ID', placeholder: 'e.g. 1', type: 'number' },
    ],
    envField: {
      key: 'tripos_environment',
      label: 'Environment',
      options: [
        { value: 'cert', label: 'Cert (Test)' },
        { value: 'prod', label: 'Production' },
      ],
    },
    helpText: 'Find your credentials in the Worldpay Developer Portal → API Credentials → triPOS',
    docsUrl: 'https://docs.worldpay.com',
  },
  {
    key: 'stripe',
    name: 'Stripe',
    description: 'Online card payments',
    color: 'bg-indigo-600',
    textColor: 'text-white',
    borderColor: 'border-indigo-500',
    enabledKey: 'stripe_enabled',
    fields: [
      { key: 'stripe_secret_key', label: 'Secret Key', placeholder: 'sk_live_... or sk_test_...', type: 'password' },
    ],
    helpText: 'Find your Secret Key in Stripe Dashboard → Developers → API Keys',
    docsUrl: 'https://stripe.com/docs',
  },
  {
    key: 'sumup',
    name: 'SumUp',
    description: 'Mobile card reader',
    color: 'bg-blue-500',
    textColor: 'text-white',
    borderColor: 'border-blue-400',
    enabledKey: 'sumup_enabled',
    fields: [
      { key: 'sumup_api_key', label: 'API Key', placeholder: 'Your SumUp API key', type: 'password' },
    ],
    helpText: 'Find your API Key in SumUp Dashboard → Account → API Keys',
    docsUrl: 'https://developer.sumup.com',
  },
];

const EMPTY_FORM = {
  tripos_enabled: false,
  tripos_acceptor_id: '',
  tripos_account_id: '',
  tripos_account_token: '',
  tripos_application_id: '',
  tripos_lane_id: '',
  tripos_environment: 'cert',
  stripe_enabled: false,
  stripe_secret_key: '',
  sumup_enabled: false,
  sumup_api_key: '',
};

export default function PaymentIntegration() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (user?.restaurant_id) fetchRestaurant();
    else setLoading(false);
  }, [user]);

  const fetchRestaurant = async () => {
    try {
      const res = await restaurantAPI.get(user.restaurant_id);
      setForm({
        tripos_enabled: res.data.tripos_enabled || false,
        tripos_acceptor_id: res.data.tripos_acceptor_id || '',
        tripos_account_id: res.data.tripos_account_id || '',
        tripos_account_token: res.data.tripos_account_token || '',
        tripos_application_id: res.data.tripos_application_id || '',
        tripos_lane_id: res.data.tripos_lane_id || '',
        tripos_environment: res.data.tripos_environment || 'cert',
        stripe_enabled: res.data.stripe_enabled || false,
        stripe_secret_key: res.data.stripe_secret_key || '',
        sumup_enabled: res.data.sumup_enabled || false,
        sumup_api_key: res.data.sumup_api_key || '',
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
      await restaurantAPI.update(user.restaurant_id, {
        ...form,
        tripos_lane_id: form.tripos_lane_id ? parseInt(form.tripos_lane_id) : null,
      });
      toast.success('Payment integrations saved!');
      fetchRestaurant();
    } catch {
      toast.error('Failed to save integrations');
    } finally {
      setSaving(false);
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
          <h1 className="text-3xl font-bold text-gray-900">Payment Integrations</h1>
          <p className="text-gray-500 mt-1">Connect your restaurant to payment providers</p>
        </div>

        <div className="space-y-6">
          {PROVIDERS.map((provider) => {
            const isEnabled = form[provider.enabledKey];
            return (
              <div
                key={provider.key}
                className={`bg-white rounded-xl shadow-md border-2 transition-all ${isEnabled ? provider.borderColor : 'border-gray-200'}`}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${provider.color} flex items-center justify-center font-bold ${provider.textColor} text-lg`}>
                      {provider.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{provider.name}</h3>
                      <p className="text-sm text-gray-500">
                        {provider.description} &mdash;{' '}
                        {isEnabled ? (
                          <span className="text-green-600 font-medium">● Connected</span>
                        ) : (
                          <span className="text-gray-400">○ Not connected</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(provider.enabledKey)}
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
                    {/* Regular fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {provider.fields.map((field) => (
                        <div key={field.key}>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            {field.label}
                          </label>
                          <input
                            type={field.type}
                            value={form[field.key]}
                            onChange={(e) => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                            placeholder={field.placeholder}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                          />
                        </div>
                      ))}

                      {/* Environment selector for triPOS */}
                      {provider.envField && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            {provider.envField.label}
                          </label>
                          <select
                            value={form[provider.envField.key]}
                            onChange={(e) => setForm(prev => ({ ...prev, [provider.envField.key]: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          >
                            {provider.envField.options.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500">{provider.helpText}</p>
                      <a
                        href={provider.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                      >
                        View {provider.name} Docs →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

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
