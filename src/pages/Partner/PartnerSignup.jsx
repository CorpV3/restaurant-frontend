import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiBriefcase, FiPhone, FiDollarSign } from 'react-icons/fi';
import { partnerAuthAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function PartnerSignup() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    company_name: '',
    phone: '',
    commission_type: 'percent',
    commission_value: 10,
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await partnerAuthAPI.signup({ ...form, commission_value: parseFloat(form.commission_value) });
      toast.success('Registration submitted! Awaiting admin approval.');
      navigate('/partner/login');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🤝 Partner Portal</h1>
          <p className="text-emerald-100">Join as a referral partner</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Partner Registration</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-3 text-gray-400" />
                  <input className="input-field pl-9" placeholder="Your full name" value={form.full_name}
                    onChange={e => set('full_name', e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-3 text-gray-400" />
                  <input className="input-field pl-9" placeholder="Choose username" value={form.username}
                    onChange={e => set('username', e.target.value)} required />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-3 text-gray-400" />
                <input type="email" className="input-field pl-9" placeholder="your@email.com" value={form.email}
                  onChange={e => set('email', e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-3 text-gray-400" />
                <input type="password" className="input-field pl-9" placeholder="Min 8 characters" value={form.password}
                  onChange={e => set('password', e.target.value)} required minLength={8} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <div className="relative">
                  <FiBriefcase className="absolute left-3 top-3 text-gray-400" />
                  <input className="input-field pl-9" placeholder="Company (optional)" value={form.company_name}
                    onChange={e => set('company_name', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-3 text-gray-400" />
                  <input className="input-field pl-9" placeholder="Phone (optional)" value={form.phone}
                    onChange={e => set('phone', e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Commission Preference</label>
              <div className="grid grid-cols-2 gap-3">
                <select className="input-field" value={form.commission_type} onChange={e => set('commission_type', e.target.value)}>
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
                <div className="relative">
                  <FiDollarSign className="absolute left-3 top-3 text-gray-400" />
                  <input type="number" className="input-field pl-9" min="0" step="0.01"
                    placeholder={form.commission_type === 'percent' ? '10' : '50'}
                    value={form.commission_value}
                    onChange={e => set('commission_value', e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {form.commission_type === 'percent'
                  ? `You'll earn ${form.commission_value}% of each restaurant's monthly/booking revenue`
                  : `You'll earn a fixed £${form.commission_value} per restaurant per month`}
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Registration'}
            </button>
          </form>

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700">
              Your account will be reviewed by an administrator. You'll be able to log in once approved.
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link to="/partner/login" className="text-sm text-emerald-600 hover:text-emerald-700">
              Already registered? Login here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
