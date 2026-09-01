import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import IndividualsSearch from './pages/IndividualsSearch';
import CompaniesSearch from './pages/CompaniesSearch';
import CreditReport from './pages/CreditReport';
import ActiveCredit from './pages/ActiveCredit';
import AddSingle from './pages/AddSingle';
import UsersManagement from './pages/UsersManagement';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/admin/enquiries/individuals" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <IndividualsSearch />
            </ProtectedRoute>
          } />

          <Route path="/admin/enquiries/companies" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <CompaniesSearch />
            </ProtectedRoute>
          } />

          <Route path="/admin/enquiries/report/:id" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <CreditReport />
            </ProtectedRoute>
          } />

          <Route path="/admin/active-credit" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ActiveCredit />
            </ProtectedRoute>
          } />

          <Route path="/admin/add-single" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AddSingle />
            </ProtectedRoute>
          } />

          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UsersManagement />
            </ProtectedRoute>
          } />

          {/* Client Routes */}
          <Route path="/client" element={
            <ProtectedRoute allowedRoles={['client', 'agent', 'support']}>
              <ClientDashboard />
            </ProtectedRoute>
          } />

          <Route path="/client/enquiries/individuals" element={
            <ProtectedRoute allowedRoles={['client', 'agent', 'support']}>
              <IndividualsSearch />
            </ProtectedRoute>
          } />

          <Route path="/client/enquiries/companies" element={
            <ProtectedRoute allowedRoles={['client', 'agent', 'support']}>
              <CompaniesSearch />
            </ProtectedRoute>
          } />

          <Route path="/client/enquiries/report/:id" element={
            <ProtectedRoute allowedRoles={['client', 'agent', 'support']}>
              <CreditReport />
            </ProtectedRoute>
          } />

          <Route path="/client/active-credit" element={
            <ProtectedRoute allowedRoles={['client', 'agent', 'support']}>
              <ActiveCredit />
            </ProtectedRoute>
          } />

          <Route path="/client/add-single" element={
            <ProtectedRoute allowedRoles={['client', 'agent', 'support']}>
              <AddSingle />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;