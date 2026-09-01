import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    HomeIcon,
    CreditCardIcon,
    PlusCircleIcon,
    LogoutIcon,
    UserGroupIcon,
} from '@heroicons/react/outline';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isAdmin = user?.role === 'admin';

    return (
        <div className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col">
            <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-primary">CrediSafe</h2>
                <p className="text-xs text-gray-500">Credit Management</p>
            </div>

            <nav className="flex-1 overflow-y-auto p-4">
                <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2 px-4">
                    Menu
                </div>
                <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                        `flex items-center px-4 py-3 rounded-lg transition-all duration-200 mb-1 ${isActive
                            ? 'bg-primary text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`
                    }
                >
                    <HomeIcon className="w-5 h-5 mr-3" />
                    Dashboard
                </NavLink>

                <NavLink
                    to="/dashboard/active-credit"
                    className={({ isActive }) =>
                        `flex items-center px-4 py-3 rounded-lg transition-all duration-200 mb-1 ${isActive
                            ? 'bg-primary text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`
                    }
                >
                    <CreditCardIcon className="w-5 h-5 mr-3" />
                    Active Credit
                </NavLink>

                {isAdmin && (
                    <>
                        <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mt-4 mb-2 px-4">
                            Admin
                        </div>
                        <NavLink
                            to="/dashboard/persons"
                            className={({ isActive }) =>
                                `flex items-center px-4 py-3 rounded-lg transition-all duration-200 mb-1 ${isActive
                                    ? 'bg-primary text-white shadow-md'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`
                            }
                        >
                            <UserGroupIcon className="w-5 h-5 mr-3" />
                            Persons
                        </NavLink>
                    </>
                )}
            </nav>

            <div className="p-4 border-t border-gray-200">
                <div className="flex items-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center font-semibold mr-3">
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{user?.username}</p>
                        <p className="text-xs text-gray-500 capitalize">{user?.role || 'User'}</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                >
                    <LogoutIcon className="w-5 h-5 mr-2" />
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Sidebar;