import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiPackage, FiGrid, FiMessageSquare, FiLogOut, FiMenu, FiX, FiUsers, FiBarChart2, FiTrendingUp, FiUserCheck } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/admin', icon: FiHome, label: 'Dashboard' },
    { path: '/admin/restaurant', icon: FiPackage, label: 'Restaurant' },
    { path: '/admin/menu', icon: FiGrid, label: 'Menu' },
    { path: '/admin/tables', icon: FiGrid, label: 'Tables' },
    { path: '/admin/staff', icon: FiUsers, label: 'Staff' },
    { path: '/admin/feedback', icon: FiMessageSquare, label: 'Feedback' },
    { path: '/admin/analytics', icon: FiBarChart2, label: 'Analytics' },
    { path: '/admin/predictions', icon: FiTrendingUp, label: 'Predictions' },
    { path: '/admin/customer-insights', icon: FiUserCheck, label: 'Customer Insights' },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gray-900 text-white transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          {sidebarOpen ? (
            <>
              <h1 className="text-xl font-bold">🍽️ Restaurant</h1>
              <button onClick={() => setSidebarOpen(false)} className="hover:bg-gray-800 p-2 rounded">
                <FiX />
              </button>
            </>
          ) : (
            <button onClick={() => setSidebarOpen(true)} className="hover:bg-gray-800 p-2 rounded mx-auto">
              <FiMenu />
            </button>
          )}
        </div>

        {/* User Info */}
        {sidebarOpen && (
          <div className="p-4 border-b border-gray-800">
            <p className="font-semibold">{user?.full_name || user?.username}</p>
            <p className="text-sm text-gray-400">{user?.role}</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Icon className="text-xl" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-colors w-full"
          >
            <FiLogOut className="text-xl" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
