import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import Inventory from './pages/Inventory';
import FindItem from './pages/FindItem';
import StockAlerts from './pages/StockAlerts';
import ExpiryAlerts from './pages/ExpiryAlerts';
import BillingHistory from './pages/BillingHistory';
import ShelfMap from './pages/ShelfMap';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import ActivityLog from './pages/ActivityLog';
import Reports from './pages/Reports';
import Architecture from './pages/Architecture';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { StockProvider } from './context/StockContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StockProvider>
          <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected routes — wrapped in Layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="billing" element={<Billing />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="find" element={<FindItem />} />
              <Route path="find-item" element={<FindItem />} />
              <Route path="stock-alerts" element={<StockAlerts />} />
              <Route path="expiry-alerts" element={<ExpiryAlerts />} />
              <Route path="billing-history" element={<BillingHistory />} />
              <Route path="shelf-map" element={<ShelfMap />} />
              <Route path="reports" element={<Reports />} />
              <Route path="activity" element={<ActivityLog />} />
              <Route path="architecture" element={<Architecture />} />
              <Route path="settings" element={<Settings />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </StockProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}


export default App;
