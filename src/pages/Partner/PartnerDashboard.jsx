import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FiUsers, FiDollarSign, FiFileText, FiTrendingUp, FiLogOut,
  FiCheckCircle, FiClock, FiDownload, FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import { partnerAPI } from '../../services/api';
import toast from 'react-hot-toast';

function usePartner() {
  const raw = localStorage.getItem('partner');
  return raw ? JSON.parse(raw) : null;
}

function usePartnerToken() {
  return localStorage.getItem('partner_token');
}

export default function PartnerDashboard() {
  const navigate = useNavigate();
  const partner = usePartner();
  const [dashboard, setDashboard] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!partner) { navigate('/partner/login'); return; }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, invRes] = await Promise.all([
        partnerAPI.getDashboard(partner.id),
        partnerAPI.listInvoices(partner.id),
      ]);
      setDashboard(dashRes.data);
      setInvoices(invRes.data);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('partner_token');
    localStorage.removeItem('partner');
    navigate('/partner/login');
  };

  const formatCurrency = (v) => `£${Number(v || 0).toFixed(2)}`;
  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });

  if (!partner) return null;
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤝</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Partner Portal</h1>
              <p className="text-sm text-gray-500">{partner.company_name || partner.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Commission: <strong className="text-emerald-600">
                {partner.commission_type === 'percent' ? `${partner.commission_value}%` : `£${partner.commission_value}`}
              </strong>
            </span>
            <button onClick={handleLogout} className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors text-sm">
              <FiLogOut /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {['overview', 'restaurants', 'invoices'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && dashboard && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Restaurants', value: dashboard.total_restaurants, icon: FiUsers, color: 'blue' },
                { label: 'Active', value: dashboard.active_restaurants, icon: FiTrendingUp, color: 'green' },
                { label: 'Total Earned', value: formatCurrency(dashboard.total_commission_earned), icon: FiDollarSign, color: 'emerald' },
                { label: 'Unpaid', value: formatCurrency(dashboard.unpaid_commission), icon: FiClock, color: 'amber' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                  <div className={`inline-flex p-2 rounded-lg bg-${color}-50 mb-3`}>
                    <Icon className={`text-${color}-600`} size={20} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-sm text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Recent Invoices */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Recent Invoices</h2>
                <button onClick={() => setActiveTab('invoices')} className="text-sm text-emerald-600 hover:text-emerald-700">
                  View all →
                </button>
              </div>
              {invoices.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No invoices yet</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {invoices.slice(0, 5).map(inv => (
                    <div key={inv.id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{inv.invoice_number}</p>
                        <p className="text-xs text-gray-500">{formatDate(inv.period_start)} – {formatDate(inv.period_end)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-700">{formatCurrency(inv.total_commission)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${inv.is_paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {inv.is_paid ? 'Paid' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Restaurants Tab */}
        {activeTab === 'restaurants' && dashboard && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">My Restaurants ({dashboard.restaurants.length})</h2>
            </div>
            {dashboard.restaurants.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No restaurants assigned to your account yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {dashboard.restaurants.map(r => (
                  <div key={r.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{r.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          r.tier === 'enterprise' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                        }`}>{r.tier}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          r.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>{r.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Billing: {r.billing_model === 'monthly' ? `£${r.monthly_charge}/month` : 'Per booking'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-emerald-700">
                        {r.commission_type === 'percent' ? `${r.commission_value}%` : `£${r.commission_value}`}
                      </p>
                      <p className="text-xs text-gray-500">commission</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            {invoices.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                No invoices generated yet. Invoices are created monthly by the admin.
              </div>
            ) : (
              invoices.map(inv => (
                <div key={inv.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedInvoice(expandedInvoice === inv.id ? null : inv.id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${inv.is_paid ? 'bg-green-50' : 'bg-amber-50'}`}>
                        {inv.is_paid ? <FiCheckCircle className="text-green-600" /> : <FiClock className="text-amber-600" />}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">{inv.invoice_number}</p>
                        <p className="text-xs text-gray-500">{formatDate(inv.period_start)} – {formatDate(inv.period_end)} · {inv.restaurants_count} restaurants</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-emerald-700 text-lg">{formatCurrency(inv.total_commission)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${inv.is_paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {inv.is_paid ? `Paid ${inv.paid_at ? formatDate(inv.paid_at) : ''}` : 'Pending Payment'}
                        </span>
                      </div>
                      {expandedInvoice === inv.id ? <FiChevronUp className="text-gray-400" /> : <FiChevronDown className="text-gray-400" />}
                    </div>
                  </button>

                  {expandedInvoice === inv.id && (
                    <div className="border-t border-gray-100 px-6 py-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Breakdown by Restaurant</h4>
                      <div className="space-y-2">
                        {(inv.line_items || []).map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                            <div>
                              <p className="font-medium text-gray-900">{item.restaurant_name}</p>
                              <p className="text-xs text-gray-500">
                                {item.billing_model === 'monthly' ? 'Monthly charge' : 'Per-booking revenue'}: {formatCurrency(item.revenue)} ·{' '}
                                {item.commission_type === 'percent' ? `${item.commission_value}%` : `£${item.commission_value} fixed`}
                              </p>
                            </div>
                            <p className="font-semibold text-emerald-700">{formatCurrency(item.commission)}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between">
                        <span className="text-sm font-semibold text-gray-700">Total Commission</span>
                        <span className="font-bold text-emerald-700">{formatCurrency(inv.total_commission)}</span>
                      </div>
                      {inv.notes && (
                        <p className="mt-2 text-xs text-gray-500 italic">{inv.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
