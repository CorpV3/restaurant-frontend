import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import QRCode from 'react-qr-code';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { tableAPI } from '../../services/api';
import axios from 'axios';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

export default function TableManagement() {
  const { user } = useAuthStore();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQR, setShowQR] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingRegenerateTableId, setPendingRegenerateTableId] = useState(null);
  const [password, setPassword] = useState('');
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [formData, setFormData] = useState({
    table_number: '',
    seat_count: 4,
    floor: '',
    section: '',
  });

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchTables();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchTables = async () => {
    try {
      const response = await tableAPI.list(user.restaurant_id);
      setTables(response.data);
    } catch (error) {
      toast.error('Failed to load tables');
      console.error('Table fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await tableAPI.create(user.restaurant_id, formData);
      toast.success('Table created with QR code!');
      setShowModal(false);
      fetchTables();
      setFormData({ table_number: '', seat_count: 4, floor: '', section: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create table');
    }
  };

  const updateStatus = async (tableId, newStatus) => {
    try {
      await tableAPI.updateStatus(user.restaurant_id, tableId, newStatus);
      toast.success('Table status updated!');
      fetchTables();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const initiateRegenerateQR = (tableId) => {
    setPendingRegenerateTableId(tableId);
    setShowPasswordModal(true);
    setPassword('');
  };

  const verifyPasswordAndRegenerateQR = async () => {
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    setVerifyingPassword(true);
    try {
      // Verify password first
      const verifyResponse = await axios.post('/api/v1/auth/verify-password', {
        password
      });

      if (!verifyResponse.data.valid) {
        toast.error('Invalid password');
        setVerifyingPassword(false);
        return;
      }

      // Password is valid, proceed with QR regeneration
      const response = await tableAPI.regenerateQR(user.restaurant_id, pendingRegenerateTableId);
      toast.success('QR code regenerated successfully!');
      fetchTables();
      setShowQR(response.data);
      setShowPasswordModal(false);
      setPassword('');
      setPendingRegenerateTableId(null);
    } catch (error) {
      console.error('Regenerate QR error:', error);
      if (error.response?.status === 401) {
        toast.error('Invalid password');
      } else {
        toast.error(error.response?.data?.detail || 'Failed to regenerate QR code');
      }
    } finally {
      setVerifyingPassword(false);
    }
  };

  const unlockTable = async (table) => {
    if (!confirm(`Unlock Table ${table.table_number}? This will clear any pending orders and make the table available.`)) {
      return;
    }

    try {
      await updateStatus(table.id, 'available');
      toast.success(`Table ${table.table_number} unlocked and ready for new orders!`);
    } catch (error) {
      toast.error('Failed to unlock table');
    }
  };

  const handleDelete = async (table) => {
    if (!confirm(`Are you sure you want to delete Table ${table.table_number}? This action cannot be undone.`)) {
      return;
    }

    try {
      await tableAPI.delete(user.restaurant_id, table.id);
      toast.success(`Table ${table.table_number} deleted successfully!`);
      fetchTables();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete table');
    }
  };

  const statusColors = {
    available: 'bg-green-100 text-green-800',
    occupied: 'bg-red-100 text-red-800',
    reserved: 'bg-yellow-100 text-yellow-800',
    cleaning: 'bg-blue-100 text-blue-800',
  };

  // Show message if no restaurant
  if (!loading && !user?.restaurant_id) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="max-w-2xl mx-auto text-center py-20">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">No Restaurant Found</h1>
            <p className="text-gray-600 mb-8">
              Please create your restaurant first in Restaurant Management before managing tables.
            </p>
            <Link to="/admin/restaurant" className="btn-primary inline-block">
              Go to Restaurant Management
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Table Management</h1>
            <p className="text-gray-600 mt-1">Manage tables and QR codes</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <FiPlus /> Add Table
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : tables.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No tables yet. Add your first table!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tables.map((table) => (
              <div key={table.id} className="bg-white rounded-xl shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{table.table_number}</h3>
                    <p className="text-sm text-gray-600">
                      {table.seat_count} seats • {table.floor}
                    </p>
                  </div>
                  <span className={`badge ${statusColors[table.status]}`}>
                    {table.status}
                  </span>
                </div>

                {/* QR Code Preview */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4 flex justify-center">
                  {table.qr_code_data ? (
                    <img src={table.qr_code_data} alt="QR Code" className="w-[120px] h-[120px]" />
                  ) : (
                    <div className="text-gray-400 text-center">No QR Code</div>
                  )}
                </div>

                {/* Status Buttons */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    onClick={() => updateStatus(table.id, 'available')}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      table.status === 'available'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    Available
                  </button>
                  <button
                    onClick={() => updateStatus(table.id, 'occupied')}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      table.status === 'occupied'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    Occupied
                  </button>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  {/* Show unlock button prominently for occupied tables */}
                  {table.status === 'occupied' && (
                    <button
                      onClick={() => unlockTable(table)}
                      className="w-full bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm font-semibold"
                    >
                      🔓 Unlock Table & Clear Orders
                    </button>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowQR(table)}
                      className="flex-1 btn-secondary text-sm"
                    >
                      View QR
                    </button>
                    <button
                      onClick={() => initiateRegenerateQR(table.id)}
                      className="flex-1 bg-blue-100 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-200 text-sm"
                    >
                      Regenerate
                    </button>
                  </div>
                  <button
                    onClick={() => handleDelete(table)}
                    className="w-full bg-red-100 text-red-600 px-3 py-2 rounded-lg hover:bg-red-200 text-sm flex items-center justify-center gap-1"
                  >
                    <FiTrash2 /> Delete Table
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Table Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-8">
              <h2 className="text-2xl font-bold mb-6">Add New Table</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Table Number</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.table_number}
                    onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Seat Count</label>
                  <input
                    type="number"
                    className="input-field"
                    value={formData.seat_count}
                    onChange={(e) => setFormData({ ...formData, seat_count: parseInt(e.target.value) })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Floor</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Section</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="submit" className="btn-primary flex-1">
                    Create Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Password Confirmation Modal for QR Regeneration */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-8">
              <h2 className="text-2xl font-bold mb-2">Confirm QR Regeneration</h2>
              <p className="text-gray-600 mb-6">Enter your password to regenerate the QR code. This will invalidate the old QR code.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Password</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && verifyPasswordAndRegenerateQR()}
                    disabled={verifyingPassword}
                    autoFocus
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={verifyPasswordAndRegenerateQR}
                    disabled={verifyingPassword}
                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {verifyingPassword ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Verifying...
                      </>
                    ) : (
                      'Confirm & Regenerate'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPassword('');
                      setPendingRegenerateTableId(null);
                    }}
                    disabled={verifyingPassword}
                    className="btn-secondary flex-1 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Warning:</strong> The old QR code will no longer work after regeneration. Print and replace all physical QR codes for this table.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* QR Code Modal */}
        {showQR && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-8 text-center">
              <h2 className="text-2xl font-bold mb-2">Table {showQR.table_number}</h2>
              <p className="text-gray-600 mb-6">Scan to view menu and order</p>

              <div className="bg-gray-50 p-8 rounded-lg mb-6 inline-block">
                {showQR.qr_code_data && (
                  <img
                    src={showQR.qr_code_data}
                    alt="QR Code"
                    className="w-64 h-64"
                  />
                )}
              </div>

              <div className="flex gap-4">
                <a
                  href={showQR.qr_code_data}
                  download={`table-${showQR.table_number}-qr.png`}
                  className="btn-secondary flex-1"
                >
                  Download QR
                </a>
                <button onClick={() => setShowQR(null)} className="btn-primary flex-1">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
