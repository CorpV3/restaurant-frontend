import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft, FiCheck, FiX, FiEdit2, FiUser, FiMail,
  FiBriefcase, FiDollarSign, FiClock, FiCheckCircle, FiFileText
} from 'react-icons/fi';
import { partnerAuthAPI, partnerAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function PartnerApproval() {
  const navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending | approved | all
  const [editingPartner, setEditingPartner] = useState(null);
  const [commForm, setCommForm] = useState({ commission_type: 'percent', commission_value: 10 });
  const [showGenerateModal, setShowGenerateModal] = useState(null); // partner object
  const [genForm, setGenForm] = useState({ period_start: '', period_end: '', notes: '' });
  const [partnerInvoices, setPartnerInvoices] = useState({});

  useEffect(() => { loadPartners(); }, [filter]);

  const loadPartners = async () => {
    setLoading(true);
    try {
      const approved = filter === 'pending' ? false : filter === 'approved' ? true : null;
      const res = await partnerAuthAPI.listPartners(approved);
      setPartners(res.data);
    } catch (err) {
      toast.error('Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await partnerAuthAPI.approvePartner(id);
      toast.success('Partner approved');
      loadPartners();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to approve');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this partner application?')) return;
    try {
      await partnerAuthAPI.rejectPartner(id);
      toast.success('Partner rejected');
      loadPartners();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reject');
    }
  };

  const handleUpdateCommission = async () => {
    try {
      await partnerAuthAPI.updateCommission(editingPartner.id, {
        commission_type: commForm.commission_type,
        commission_value: parseFloat(commForm.commission_value),
      });
      toast.success('Commission updated');
      setEditingPartner(null);
      loadPartners();
    } catch (err) {
      toast.error('Failed to update commission');
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      await partnerAPI.generateInvoice(showGenerateModal.id, {
        period_start: new Date(genForm.period_start).toISOString(),
        period_end: new Date(genForm.period_end + 'T23:59:59').toISOString(),
        notes: genForm.notes || undefined,
      });
      toast.success('Invoice generated');
      setShowGenerateModal(null);
      setGenForm({ period_start: '', period_end: '', notes: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate invoice');
    }
  };

  const loadInvoices = async (partnerId) => {
    try {
      const res = await partnerAPI.listInvoices(partnerId);
      setPartnerInvoices(prev => ({ ...prev, [partnerId]: res.data }));
    } catch { /* ignore */ }
  };

  const handleMarkPaid = async (partnerId, invoiceId) => {
    try {
      await partnerAPI.markPaid(partnerId, invoiceId);
      toast.success('Invoice marked as paid');
      loadInvoices(partnerId);
    } catch (err) {
      toast.error('Failed to mark paid');
    }
  };

  const formatCurrency = (v) => `£${Number(v || 0).toFixed(2)}`;
  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link to="/master-admin" className="text-gray-500 hover:text-gray-900">
            <FiArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Partner Management</h1>
            <p className="text-sm text-gray-500">Approve partners & manage commissions</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Filter tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { key: 'pending', label: 'Pending Approval' },
            { key: 'approved', label: 'Approved' },
            { key: 'all', label: 'All' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : partners.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            No {filter === 'pending' ? 'pending' : filter === 'approved' ? 'approved' : ''} partners
          </div>
        ) : (
          <div className="space-y-4">
            {partners.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <FiUser className="text-emerald-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{p.full_name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            p.is_approved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {p.is_approved ? 'Approved' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                          <FiMail size={12} /> {p.email}
                          {p.company_name && <><FiBriefcase size={12} className="ml-2" /> {p.company_name}</>}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Commission: <strong className="text-emerald-700">
                            {p.commission_type === 'percent' ? `${p.commission_value}%` : `£${p.commission_value} fixed`}
                          </strong>
                          {' · '}Joined: {formatDate(p.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!p.is_approved && (
                        <>
                          <button onClick={() => handleApprove(p.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                            <FiCheck size={14} /> Approve
                          </button>
                          <button onClick={() => handleReject(p.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors">
                            <FiX size={14} /> Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => { setEditingPartner(p); setCommForm({ commission_type: p.commission_type, commission_value: p.commission_value }); }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                        <FiEdit2 size={14} /> Commission
                      </button>
                      {p.is_approved && (
                        <>
                          <button onClick={() => { setShowGenerateModal(p); setGenForm({ period_start: '', period_end: '', notes: '' }); }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-medium transition-colors">
                            <FiFileText size={14} /> Gen Invoice
                          </button>
                          <button onClick={() => loadInvoices(p.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors">
                            View Invoices
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Inline invoices */}
                  {partnerInvoices[p.id] && (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Invoices</h4>
                      {partnerInvoices[p.id].length === 0 ? (
                        <p className="text-sm text-gray-500">No invoices yet</p>
                      ) : (
                        <div className="space-y-2">
                          {partnerInvoices[p.id].map(inv => (
                            <div key={inv.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 text-sm">
                              <div>
                                <span className="font-medium">{inv.invoice_number}</span>
                                <span className="text-gray-500 ml-2">{formatDate(inv.period_start)} – {formatDate(inv.period_end)}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-emerald-700">{formatCurrency(inv.total_commission)}</span>
                                {inv.is_paid ? (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Paid</span>
                                ) : (
                                  <button onClick={() => handleMarkPaid(p.id, inv.id)}
                                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full transition-colors">
                                    Mark Paid
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Commission Modal */}
      {editingPartner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Update Commission — {editingPartner.full_name}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commission Type</label>
                <select className="input-field" value={commForm.commission_type}
                  onChange={e => setCommForm(f => ({ ...f, commission_type: e.target.value }))}>
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (£)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {commForm.commission_type === 'percent' ? 'Percentage (%)' : 'Fixed Amount (£)'}
                </label>
                <input type="number" className="input-field" min="0" step="0.01"
                  value={commForm.commission_value}
                  onChange={e => setCommForm(f => ({ ...f, commission_value: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleUpdateCommission}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors">
                Save
              </button>
              <button onClick={() => setEditingPartner(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Invoice Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Generate Invoice — {showGenerateModal.full_name}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period Start *</label>
                <input type="date" className="input-field" value={genForm.period_start}
                  onChange={e => setGenForm(f => ({ ...f, period_start: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period End *</label>
                <input type="date" className="input-field" value={genForm.period_end}
                  onChange={e => setGenForm(f => ({ ...f, period_end: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input className="input-field" placeholder="e.g. March 2026" value={genForm.notes}
                  onChange={e => setGenForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <p className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
                Commission will be automatically calculated based on each restaurant's billing model and rate.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleGenerateInvoice}
                disabled={!genForm.period_start || !genForm.period_end}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2 rounded-lg font-medium transition-colors">
                Generate
              </button>
              <button onClick={() => setShowGenerateModal(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
