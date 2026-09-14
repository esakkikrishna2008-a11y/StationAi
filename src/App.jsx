<<<<<<< HEAD
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
=======
import { BrowserRouter, Routes, Route } from 'react-router-dom';
>>>>>>> origin/main
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FindItem from './pages/FindItem';
import Inventory from './pages/Inventory';
import Architecture from './pages/Architecture';
<<<<<<< HEAD
import ExpiryAlerts from './pages/ExpiryAlerts';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { StockProvider } from './context/StockContext';
import { AuthProvider } from './context/AuthContext';
=======
import { StockProvider } from './context/StockContext';
>>>>>>> origin/main
import './index.css';

function App() {
  return (
<<<<<<< HEAD
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
              <Route path="find" element={<FindItem />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="architecture" element={<Architecture />} />
              <Route path="expiry-alerts" element={<ExpiryAlerts />} />
              <Route path="settings" element={<Settings />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </StockProvider>
    </AuthProvider>
=======
    <StockProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="find" element={<FindItem />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="architecture" element={<Architecture />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StockProvider>
>>>>>>> origin/main
  );
}

export default App;
