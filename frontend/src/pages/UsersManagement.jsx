import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import api from '../services/api';
import { useToast } from '../components/Toaster';
import {
    PlusCircleIcon,
    PencilIcon,
    TrashIcon,
    XCircleIcon,
    SearchIcon,
    EyeIcon,
    EyeOffIcon,
} from '@heroicons/react/outline';

const UsersManagement = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [users, setUsers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showPassword2, setShowPassword2] = useState(false);

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        password2: '',
        phone_number: '',
        email: '',
        role: 'client',
        is_client_user: false,
        is_active: true,
        company_id: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, companiesRes] = await Promise.all([
                api.get('/users/'),
                api.get('/companies/'),
            ]);
            setUsers(usersRes.data);
            setCompanies(companiesRes.data.results || companiesRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            showToast('Failed to fetch users data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchData();
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.password2) {
            showToast('Passwords do not match!', 'error');
            return;
        }

        if (formData.password.length < 6) {
            showToast('Password must be at least 6 characters long', 'error');
            return;
        }

        try {
            const data = {
                username: formData.username,
                password: formData.password,
                phone_number: formData.phone_number,
                email: formData.email,
                role: formData.role,
                is_client_user: formData.is_client_user,
                company_id: formData.company_id || null,
            };

            await api.post('/auth/register/', data);
            showToast('User added successfully!', 'success');
            setShowAddModal(false);
            resetForm();
            fetchData();
        } catch (error) {
            console.error('Error adding user:', error);
            const errorMsg = error.response?.data?.detail || error.response?.data?.error || 'Failed to add user. Please try again.';
            showToast(errorMsg, 'error');
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        try {
            const data = {
                username: formData.username,
                phone_number: formData.phone_number,
                email: formData.email,
                role: formData.role,
                is_client_user: formData.is_client_user,
                is_active: formData.is_active,
                company_id: formData.company_id || null,
            };

            if (formData.password) {
                if (formData.password.length < 6) {
                    showToast('Password must be at least 6 characters long', 'error');
                    return;
                }
                data.password = formData.password;
            }

            await api.put(`/users/${editingUser.id}/`, data);
            showToast('User updated successfully!', 'success');
            setEditingUser(null);
            resetForm();
            fetchData();
        } catch (error) {
            console.error('Error updating user:', error);
            const errorMsg = error.response?.data?.detail || error.response?.data?.error || 'Failed to update user. Please try again.';
            showToast(errorMsg, 'error');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await api.delete(`/users/${userId}/`);
                showToast('User deleted successfully!', 'success');
                fetchData();
            } catch (error) {
                console.error('Error deleting user:', error);
                showToast('Failed to delete user. Please try again.', 'error');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            username: '',
            password: '',
            password2: '',
            phone_number: '',
            email: '',
            role: 'client',
            is_client_user: false,
            is_active: true,
            company_id: '',
        });
        setShowPassword(false);
        setShowPassword2(false);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setFormData({
            username: user.username || '',
            password: '',
            password2: '',
            phone_number: user.phone_number || '',
            email: user.email || '',
            role: user.role || 'client',
            is_client_user: user.is_client_user || false,
            is_active: user.is_active !== undefined ? user.is_active : true,
            company_id: user.company?.id || '',
        });
    };

    const filteredUsers = users.filter(user => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            user.username?.toLowerCase().includes(query) ||
            user.phone_number?.includes(query) ||
            user.email?.toLowerCase().includes(query) ||
            user.role?.toLowerCase().includes(query)
        );
    });

    if (loading) {
        return (
            <div className="flex h-screen bg-gray-50">
                <AdminSidebar />
                <div className="flex-1 ml-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <AdminSidebar />
            <div className="flex-1 ml-64 overflow-y-auto p-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-primary">CREDISAFE</h1>
                        <h2 className="text-xl font-semibold text-gray-700 mt-1">User Management</h2>
                    </div>
                    <button
                        onClick={() => {
                            resetForm();
                            setShowAddModal(true);
                        }}
                        className="btn-primary flex items-center gap-2 px-6 py-2"
                    >
                        <PlusCircleIcon className="w-5 h-5" />
                        Add User
                    </button>
                </div>

                {/* Search Bar */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <div className="flex-1 relative">
                            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by username, phone, email, or role..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                        <button type="submit" className="btn-primary px-6 py-2">
                            Search
                        </button>
                    </form>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <th className="px-4 py-3">Username</th>
                                    <th className="px-4 py-3">Phone</th>
                                    <th className="px-4 py-3">Email</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">Company</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium">{user.username}</td>
                                        <td className="px-4 py-3">{user.phone_number}</td>
                                        <td className="px-4 py-3">{user.email || '-'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-red-100 text-red-800' :
                                                user.role === 'client' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">{user.company?.name || '-'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="Edit"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="text-red-600 hover:text-red-800"
                                                    title="Delete"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredUsers.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No users found</p>
                        </div>
                    )}
                </div>

                {/* Add/Edit Modal */}
                {(showAddModal || editingUser) && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {editingUser ? 'Edit User' : 'Add New User'}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setEditingUser(null);
                                        resetForm();
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <XCircleIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={editingUser ? handleEditUser : handleAddUser}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="label-text">Username *</label>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            className="input-field"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="label-text">Phone Number *</label>
                                        <input
                                            type="text"
                                            value={formData.phone_number}
                                            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                            className="input-field"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="label-text">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="input-field"
                                        />
                                    </div>
                                    <div>
                                        <label className="label-text">Role</label>
                                        <select
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            className="input-field"
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="client">Client</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label-text">Company (for Client Users)</label>
                                        <select
                                            value={formData.company_id}
                                            onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                                            className="input-field"
                                        >
                                            <option value="">No Company</option>
                                            {companies.map((company) => (
                                                <option key={company.id} value={company.id}>
                                                    {company.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_client_user}
                                                onChange={(e) => setFormData({ ...formData, is_client_user: e.target.checked })}
                                                className="w-4 h-4 text-primary"
                                            />
                                            <span className="text-sm text-gray-700">Is Client User</span>
                                        </label>
                                    </div>
                                    {!editingUser && (
                                        <>
                                            <div className="relative">
                                                <label className="label-text">Password *</label>
                                                <div className="relative">
                                                    <input
                                                        type={showPassword ? 'text' : 'password'}
                                                        value={formData.password}
                                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                        className="input-field pr-10"
                                                        required={!editingUser}
                                                        minLength={6}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                    >
                                                        {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
                                            </div>
                                            <div className="relative">
                                                <label className="label-text">Confirm Password *</label>
                                                <div className="relative">
                                                    <input
                                                        type={showPassword2 ? 'text' : 'password'}
                                                        value={formData.password2}
                                                        onChange={(e) => setFormData({ ...formData, password2: e.target.value })}
                                                        className="input-field pr-10"
                                                        required={!editingUser}
                                                        minLength={6}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword2(!showPassword2)}
                                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                    >
                                                        {showPassword2 ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    {editingUser && (
                                        <div className="relative">
                                            <label className="label-text">New Password (optional)</label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={formData.password}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                    className="input-field pr-10"
                                                    placeholder="Leave blank to keep current"
                                                    minLength={6}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                >
                                                    {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters if changed</p>
                                        </div>
                                    )}
                                    <div className="md:col-span-2">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_active}
                                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                                className="w-4 h-4 text-primary"
                                            />
                                            <span className="text-sm text-gray-700">Is Active</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6 pt-4 border-t">
                                    <button type="submit" className="flex-1 btn-primary py-2 font-semibold">
                                        {editingUser ? 'Update User' : 'Add User'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddModal(false);
                                            setEditingUser(null);
                                            resetForm();
                                        }}
                                        className="flex-1 btn-secondary py-2 font-semibold"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UsersManagement;