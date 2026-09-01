import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { user, isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // If no allowedRoles specified, allow all authenticated users
    if (allowedRoles.length === 0) {
        return children;
    }

    // Check if user has any of the allowed roles
    // For superusers, allow access to everything
    if (user?.is_superuser) {
        return children;
    }

    // Check if user's role is in allowedRoles
    const userRole = user?.role || 'agent';
    if (!allowedRoles.includes(userRole)) {
        // Redirect to appropriate dashboard based on role
        if (userRole === 'admin' || user?.is_superuser) {
            return <Navigate to="/admin" replace />;
        } else if (userRole === 'client' || user?.is_client_user) {
            return <Navigate to="/client" replace />;
        } else {
            return <Navigate to="/login" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;