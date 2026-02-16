import { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiUsers, FiEdit2 } from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { staffAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

export default function StaffManagement() {
  const { user } = useAuthStore();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null); // Staff member being edited
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'chef', 'customer'
  const [staffType, setStaffType] = useState('chef'); // Type to create
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
  });

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchStaff();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchStaff = async () => {
    try {
      const response = await staffAPI.listStaff(user.restaurant_id, null);
      setStaff(response.data);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStaff) {
        // Update existing staff
        const updateData = {
          full_name: formData.full_name,
          email: formData.email,
        };
        // Only include password if it's provided
        if (formData.password) {
          updateData.password = formData.password;
        }

        await staffAPI.updateStaff(editingStaff.id, updateData);
        toast.success('Staff account updated successfully!');
      } else {
        // Create new staff
        const data = {
          ...formData,
          restaurant_id: user.restaurant_id,
        };

        if (staffType === 'chef') {
          await staffAPI.createChef(data);
          toast.success('Chef account created successfully!');
        } else {
          await staffAPI.createCustomer(data);
          toast.success('Customer account created successfully!');
        }
      }

      setShowModal(false);
      setEditingStaff(null);
      resetForm();
      fetchStaff();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || `Failed to ${editingStaff ? 'update' : 'create'} account`;
      toast.error(errorMsg);
    }
  };

  const handleEdit = (staffMember) => {
    setEditingStaff(staffMember);
    setFormData({
      username: staffMember.username,
      email: staffMember.email || '',
      password: '', // Leave empty, only update if provided
      full_name: staffMember.full_name || '',
    });
    setStaffType(staffMember.role?.toLowerCase() || 'chef');
    setShowModal(true);
  };

  const handleToggleStatus = async (staffMember) => {
    try {
      await staffAPI.toggleStatus(staffMember.id);
      toast.success(`Account ${staffMember.is_active ? 'deactivated' : 'activated'}`);
      fetchStaff();
    } catch (error) {
      toast.error('Failed to toggle account status');
    }
  };

  const handleDelete = async (staffMember) => {
    if (!confirm(`Are you sure you want to delete ${staffMember.full_name || staffMember.username}?`)) return;

    try {
      // Use role-specific delete endpoints (RESTAURANT_ADMIN has permission for these)
      const role = staffMember.role?.toUpperCase();
      if (role === 'CHEF') {
        await staffAPI.deleteChef(staffMember.id);
      } else if (role === 'CUSTOMER') {
        await staffAPI.deleteCustomer(staffMember.id);
      } else {
        toast.error(`Cannot delete user with role: ${staffMember.role}`);
        return;
      }
      toast.success('Account deleted');
      fetchStaff();
    } catch (error) {
      console.error('Delete error:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to delete account';
      toast.error(errorMsg);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      full_name: '',
    });
  };

  const filteredStaff = staff.filter(member => {
    if (activeTab === 'all') return true;
    if (activeTab === 'chef') return member.role === 'CHEF';
    if (activeTab === 'customer') return member.role === 'CUSTOMER';
    return true;
  });

  if (!user?.restaurant_id) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="max-w-2xl mx-auto text-center py-20">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">No Restaurant Found</h1>
            <p className="text-gray-600 mb-8">
              Please create your restaurant first before managing staff.
            </p>
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
            <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
            <p className="text-gray-600 mt-1">Manage your chefs and customer accounts</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <FiPlus /> Add Staff
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({staff.length})
          </button>
          <button
            onClick={() => setActiveTab('chef')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'chef'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Chefs ({staff.filter(s => s.role === 'CHEF').length})
          </button>
          <button
            onClick={() => setActiveTab('customer')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'customer'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Customers ({staff.filter(s => s.role === 'CUSTOMER').length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="text-center py-20">
            <FiUsers className="mx-auto text-6xl text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">
              {activeTab === 'all' ? 'No staff yet. Add your first staff member!' : `No ${activeTab}s yet.`}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{member.full_name || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{member.username}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{member.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          member.role === 'CHEF'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {member.role === 'CHEF' ? 'Chef' : 'Customer'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          member.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {member.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleEdit(member)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        >
                          <FiEdit2 /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(member)}
                          className="text-red-600 hover:text-red-900 flex items-center gap-1"
                        >
                          <FiTrash2 /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Staff Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-8">
              <h2 className="text-2xl font-bold mb-6">
                {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Staff Type Selection - Only show when creating new staff */}
                {!editingStaff && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Staff Type</label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="staffType"
                          value="chef"
                          checked={staffType === 'chef'}
                          onChange={(e) => setStaffType(e.target.value)}
                          className="mr-2"
                        />
                        <span>Chef</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="staffType"
                          value="customer"
                          checked={staffType === 'customer'}
                          onChange={(e) => setStaffType(e.target.value)}
                          className="mr-2"
                        />
                        <span>Customer</span>
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Username</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    disabled={editingStaff}
                    required={!editingStaff}
                  />
                  {editingStaff && (
                    <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    className="input-field"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Password {editingStaff && '(leave empty to keep current)'}
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingStaff}
                    minLength="8"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {editingStaff
                      ? 'Only enter a password if you want to change it (minimum 8 characters)'
                      : 'Minimum 8 characters'}
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="submit" className="btn-primary flex-1">
                    {editingStaff ? 'Update Staff' : `Create ${staffType === 'chef' ? 'Chef' : 'Customer'}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingStaff(null);
                      resetForm();
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
