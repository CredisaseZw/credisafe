import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    HomeIcon,
    CreditCardIcon,
    PlusCircleIcon,
    LogoutIcon,
    UserGroupIcon,
    OfficeBuildingIcon,
    UsersIcon,
    DocumentTextIcon,
    ChartBarIcon,
    CogIcon,
    SearchIcon,
    ShieldCheckIcon,
} from '@heroicons/react/outline';

const AdminSidebar = () => {
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
                <p className="text-xs text-gray-500">Admin Panel</p>
            </div>

            <nav className="flex-1 overflow-y-auto p-4">
                {/* Main Menu */}
                <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2 px-4">
                    Main Menu
                </div>

                <NavLink
                    to="/admin"
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

                {/* Enquiries Sub-menu
                <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mt-4 mb-2 px-4">
                    Enquiries
                </div>

                <NavLink
                    to="/admin/enquiries/individuals"
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
                    to="/admin/enquiries/companies"
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

                <NavLink
                    to="/admin/enquiries/assetsafe"
                    className={({ isActive }) =>
                        `flex items-center px-4 py-3 rounded-lg transition-all duration-200 mb-1 ${isActive
                            ? 'bg-primary text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`
                    }
                >
                    <ShieldCheckIcon className="w-5 h-5 mr-3" />
                    AssetSafe
                </NavLink> */}

                {/* Credit Management */}
                <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mt-4 mb-2 px-4">
                    Credit Management
                </div>

                <NavLink
                    to="/admin/active-credit"
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
                    to="/admin/add-single"
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

                {/* Management */}
                <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mt-4 mb-2 px-4">
                    Management
                </div>

                <NavLink
                    to="/admin/users"
                    className={({ isActive }) =>
                        `flex items-center px-4 py-3 rounded-lg transition-all duration-200 mb-1 ${isActive
                            ? 'bg-primary text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`
                    }
                >
                    <UsersIcon className="w-5 h-5 mr-3" />
                    Users
                </NavLink>

                <NavLink
                    to="/admin/persons"
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

                <NavLink
                    to="/admin/companies"
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

                <NavLink
                    to="/admin/receipts"
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
                    to="/admin/reports"
                    className={({ isActive }) =>
                        `flex items-center px-4 py-3 rounded-lg transition-all duration-200 mb-1 ${isActive
                            ? 'bg-primary text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`
                    }
                >
                    <ChartBarIcon className="w-5 h-5 mr-3" />
                    Reports
                </NavLink>

                <NavLink
                    to="/admin/settings"
                    className={({ isActive }) =>
                        `flex items-center px-4 py-3 rounded-lg transition-all duration-200 mb-1 ${isActive
                            ? 'bg-primary text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`
                    }
                >
                    <CogIcon className="w-5 h-5 mr-3" />
                    Settings
                </NavLink>
            </nav>

            <div className="p-4 border-t border-gray-200">
                <div className="flex items-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center font-semibold mr-3">
                        {user?.username?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{user?.username}</p>
                        <p className="text-xs text-gray-500">Administrator</p>
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

export default AdminSidebar;