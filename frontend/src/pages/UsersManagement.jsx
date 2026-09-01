import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import api from '../services/api';
import { PlusCircleIcon, XCircleIcon, PencilIcon, TrashIcon } from '@heroicons/react/outline';

const UsersManagement = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        password2: '',
        phone_number: '',
        email: '',
        role: 'agent',
        is_client_user: false,
        is_active: true,
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users/');
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
            alert('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            await api.post('/auth/register/', formData);
            alert('User added successfully!');
            setShowAddModal(false);
            setFormData({ username: '', password: '', password2: '', phone_number: '', email: '', role: 'agent', is_client_user: false, is_active: true });
            fetchUsers();
        } catch (error) {
            console.error('Error adding user:', error);
            alert('Failed to add user');
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/users/${editingUser.id}/`, formData);
            alert('User updated successfully!');
            setEditingUser(null);
            setFormData({ username: '', password: '', password2: '', phone_number: '', email: '', role: 'agent', is_client_user: false, is_active: true });
            fetchUsers();
        } catch (error) {
            console.error('Error updating user:', error);
            alert('Failed to update user');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await api.delete(`/users/${userId}/`);
                alert('User deleted successfully!');
                fetchUsers();
            } catch (error) {
                console.error('Error deleting user:', error);
                alert('Failed to delete user');
            }
        }
    };

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
                        onClick={() => setShowAddModal(true)}
                        className="btn-primary flex items-center gap-2 px-6 py-2"
                    >
                        <PlusCircleIcon className="w-5 h-5" />
                        Add User
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <th className="px-4 py-3">Username</th>
                                    <th className="px-4 py-3">Phone</th>
                                    <th className="px-4 py-3">Email</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {users.map((user) => (
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
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingUser(user);
                                                        setFormData({
                                                            username: user.username,
                                                            phone_number: user.phone_number,
                                                            email: user.email || '',
                                                            role: user.role,
                                                            is_client_user: user.is_client_user,
                                                            is_active: user.is_active,
                                                        });
                                                    }}
                                                    className="text-blue-600 hover:text-blue-800"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="text-red-600 hover:text-red-800"
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
                                        setFormData({ username: '', password: '', password2: '', phone_number: '', email: '', role: 'agent', is_client_user: false, is_active: true });
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
                                            {/* <option value="agent">Agent</option> */}
                                            <option value="client">Client</option>
                                            <option value="admin">Admin</option>
                                            {/* <option value="support">Support</option> */}
                                        </select>
                                    </div>
                                    {!editingUser && (
                                        <>
                                            <div>
                                                <label className="label-text">Password *</label>
                                                <input
                                                    type="password"
                                                    value={formData.password}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                    className="input-field"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="label-text">Confirm Password *</label>
                                                <input
                                                    type="password"
                                                    value={formData.password2}
                                                    onChange={(e) => setFormData({ ...formData, password2: e.target.value })}
                                                    className="input-field"
                                                    required
                                                />
                                            </div>
                                        </>
                                    )}
                                    {/* <div className="col-span-2">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_client_user}
                                                onChange={(e) => setFormData({ ...formData, is_client_user: e.target.checked })}
                                                className="w-4 h-4 text-primary"
                                            />
                                            <span className="text-sm text-gray-700">Is Client User</span>
                                        </label>
                                    </div> */}
                                    <div className="col-span-2">
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
                                            setFormData({ username: '', password: '', password2: '', phone_number: '', email: '', role: 'agent', is_client_user: false, is_active: true });
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