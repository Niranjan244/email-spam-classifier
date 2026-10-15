import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ClassifyPage from './pages/ClassifyPage';
import BulkClassifyPage from './pages/BulkClassifyPage';
import HistoryPage from './pages/HistoryPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProfilePage from './pages/ProfilePage';
import GmailScannerPage from './pages/GmailScannerPage';
import AdminOverviewPage from './pages/AdminOverviewPage';
import AdminDatasetsPage from './pages/AdminDatasetsPage';
import AdminModelsPage from './pages/AdminModelsPage';
import AdminUsersPage from './pages/AdminUsersPage';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected Application Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* User accessible routes */}
              <Route index element={<DashboardPage />} />
              <Route path="classify" element={<ClassifyPage />} />
              <Route path="classify/bulk" element={<BulkClassifyPage />} />
              <Route path="gmail-scanner" element={<GmailScannerPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="profile" element={<ProfilePage />} />

              {/* Admin only routes */}
              <Route element={<AdminRoute />}>
                <Route path="admin" element={<AdminOverviewPage />} />
                <Route path="admin/datasets" element={<AdminDatasetsPage />} />
                <Route path="admin/models" element={<AdminModelsPage />} />
                <Route path="admin/users" element={<AdminUsersPage />} />
              </Route>
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
