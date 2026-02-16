import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';

// Auth Pages
import LoginPage from './pages/Auth/LoginPage';
import SignupPage from './pages/Auth/SignupPage';

// Customer Pages
import QRScanLanding from './pages/Customer/QRScanLanding';
import MenuView from './pages/Customer/MenuView';
import OrderTracking from './pages/Customer/OrderTracking';
import CustomerLoginPage from './pages/Customer/CustomerLoginPage';
import RestaurantMenuPage from './pages/Customer/RestaurantMenuPage';
import CheckoutPage from './pages/Customer/CheckoutPage';
import OrderTrackingPage from './pages/Customer/OrderTrackingPage';

// Public Pages (No Auth Required)
import PublicMenu from './pages/Public/PublicMenu';

// Restaurant Admin Pages
import AdminDashboard from './pages/Admin/AdminDashboard';
import RestaurantManagement from './pages/Admin/RestaurantManagement';
import MenuManagement from './pages/Admin/MenuManagement';
import TableManagement from './pages/Admin/TableManagement';
import StaffManagement from './pages/Admin/StaffManagement';
import FeedbackView from './pages/Admin/FeedbackView';
import AnalyticsDashboard from './pages/Admin/AnalyticsDashboard';
import PredictionsDashboard from './pages/Admin/PredictionsDashboard';
import CustomerInsights from './pages/Admin/CustomerInsights';

// Chef Pages
import KitchenDashboard from './pages/Kitchen/KitchenDashboard';

// Master Admin Pages
import MasterAdminDashboard from './pages/MasterAdmin/MasterAdminDashboard';
import UserManagement from './pages/MasterAdmin/UserManagement';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const { isAuthenticated, user } = useAuthStore();

  // Redirect authenticated users to appropriate dashboard
  const getDefaultRoute = () => {
    if (!isAuthenticated) return '/login';

    switch (user?.role) {
      case 'master_admin':
        return '/master-admin';
      case 'restaurant_admin':
        return '/admin';
      case 'chef':
        return '/kitchen';
      case 'customer':
      default:
        return '/customer/orders';
    }
  };

  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Customer Login/Register */}
        <Route path="/customer-login" element={<CustomerLoginPage />} />

        {/* Customer Online Ordering Flow */}
        <Route path="/customer/menu" element={<RestaurantMenuPage />} />
        <Route path="/customer/checkout" element={<CheckoutPage />} />
        <Route path="/customer/order-tracking/:orderId" element={<OrderTrackingPage />} />

        {/* Public Routes - QR Code Menu (No Auth) */}
        <Route path="/menu/:restaurantId/:tableId" element={<PublicMenu />} />
        <Route path="/table/:restaurantId/:tableId" element={<PublicMenu />} />

        {/* Customer Routes - QR Code Flow */}
        <Route path="/table/:tableId" element={<QRScanLanding />} />
        <Route path="/menu/:restaurantId" element={<MenuView />} />
        <Route path="/customer/orders" element={<OrderTracking />} />
        <Route path="/order/:orderId" element={<OrderTracking />} />

        {/* Restaurant Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['restaurant_admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/restaurant"
          element={
            <ProtectedRoute allowedRoles={['restaurant_admin']}>
              <RestaurantManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/menu"
          element={
            <ProtectedRoute allowedRoles={['restaurant_admin']}>
              <MenuManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tables"
          element={
            <ProtectedRoute allowedRoles={['restaurant_admin']}>
              <TableManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/staff"
          element={
            <ProtectedRoute allowedRoles={['restaurant_admin']}>
              <StaffManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/feedback"
          element={
            <ProtectedRoute allowedRoles={['restaurant_admin']}>
              <FeedbackView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute allowedRoles={['restaurant_admin']}>
              <AnalyticsDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/predictions"
          element={
            <ProtectedRoute allowedRoles={['restaurant_admin']}>
              <PredictionsDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/customer-insights"
          element={
            <ProtectedRoute allowedRoles={['restaurant_admin']}>
              <CustomerInsights />
            </ProtectedRoute>
          }
        />

        {/* Kitchen Routes */}
        <Route
          path="/kitchen"
          element={
            <ProtectedRoute allowedRoles={['chef']}>
              <KitchenDashboard />
            </ProtectedRoute>
          }
        />

        {/* Master Admin Routes */}
        <Route
          path="/master-admin"
          element={
            <ProtectedRoute allowedRoles={['master_admin']}>
              <MasterAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/master-admin/users"
          element={
            <ProtectedRoute allowedRoles={['master_admin']}>
              <UserManagement />
            </ProtectedRoute>
          }
        />

        {/* Default Route */}
        <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />

        {/* 404 Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
