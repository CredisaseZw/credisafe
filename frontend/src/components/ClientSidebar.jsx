import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    HomeIcon,
    CreditCardIcon,
    PlusCircleIcon,
    LogoutIcon,
    DocumentTextIcon,
    UserIcon,
    SearchIcon,
    OfficeBuildingIcon,
} from '@heroicons/react/outline';

const ClientSidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col">
            <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-primary">CrediSafe</h2>
                <p className="text-xs text-gray-500">
                    {user?.company?.name || 'Client Portal'}
                </p>
            </div>

            <nav className="flex-1 overflow-y-auto p-4">
                {/* Main Menu */}
                <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2 px-4">
                    Main Menu
                </div>

                <NavLink
                    to="/client"
                    end
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

                {/* Enquiries */}
                <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mt-4 mb-2 px-4">
                    Enquiries
                </div>

                <NavLink
                    to="/client/enquiries/individuals"
                    className={({ isActive }) =>
                        `flex items-center px-4 py-3 rounded-lg transition-all duration-200 mb-1 ${isActive
                            ? 'bg-primary text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`
                    }
                >
                    <SearchIcon className="w-5 h-5 mr-3" />
                    Individuals
                </NavLink>

                <NavLink
                    to="/client/enquiries/companies"
                    className={({ isActive }) =>
                        `flex items-center px-4 py-3 rounded-lg transition-all duration-200 mb-1 ${isActive
                            ? 'bg-primary text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`
                    }
                >
                    <OfficeBuildingIcon className="w-5 h-5 mr-3" />
                    Companies
                </NavLink>

                {/* Credit Management */}
                <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mt-4 mb-2 px-4">
                    Credit Management
                </div>

                <NavLink
                    to="/client/active-credit"
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

                <NavLink
                    to="/client/add-single"
                    className={({ isActive }) =>
                        `flex items-center px-4 py-3 rounded-lg transition-all duration-200 mb-1 ${isActive
                            ? 'bg-primary text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`
                    }
                >
                    <PlusCircleIcon className="w-5 h-5 mr-3" />
                    Add Single
                </NavLink>

                {/* Reports */}
                <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mt-4 mb-2 px-4">
                    Reports
                </div>

                <NavLink
                    to="/client/receipts"
                    className={({ isActive }) =>
                        `flex items-center px-4 py-3 rounded-lg transition-all duration-200 mb-1 ${isActive
                            ? 'bg-primary text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`
                    }
                >
                    <DocumentTextIcon className="w-5 h-5 mr-3" />
                    Receipts
                </NavLink>

                <NavLink
                    to="/client/profile"
                    className={({ isActive }) =>
                        `flex items-center px-4 py-3 rounded-lg transition-all duration-200 mb-1 ${isActive
                            ? 'bg-primary text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`
                    }
                >
                    <UserIcon className="w-5 h-5 mr-3" />
                    Profile
                </NavLink>
            </nav>

            <div className="p-4 border-t border-gray-200">
                <div className="flex items-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center font-semibold mr-3">
                        {user?.username?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{user?.username}</p>
                        <p className="text-xs text-gray-500">
                            {user?.is_client_user ? 'Client User' : user?.role || 'User'}
                        </p>
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

export default ClientSidebar;