import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import api from '../services/api';
import {
    PlusCircleIcon,
    PencilIcon,
    TrashIcon,
    XCircleIcon,
    SearchIcon,
    UsersIcon,
} from '@heroicons/react/outline';

const CompanyManagement = () => {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [companyUsers, setCompanyUsers] = useState([]);
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        registration_number: '',
        phone: '',
        email: '',
        address: '',
        is_active: true,
    });

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const response = await api.get('/companies/');
            setCompanies(response.data.results || response.data || []);
        } catch (error) {
            console.error('Error fetching companies:', error);
            alert('Failed to fetch companies');
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanyUsers = async (companyId) => {
        try {
            const response = await api.get(`/companies/${companyId}/users/`);
            setCompanyUsers(response.data);
            setShowUsersModal(true);
        } catch (error) {
            console.error('Error fetching company users:', error);
            alert('Failed to fetch company users');
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchCompanies();
    };

    const handleAddCompany = async (e) => {
        e.preventDefault();
        try {
            await api.post('/companies/', formData);
            alert('Company added successfully!');
            setShowAddModal(false);
            resetForm();
            fetchCompanies();
        } catch (error) {
            console.error('Error adding company:', error);
            alert('Failed to add company. Please try again.');
        }
    };

    const handleEditCompany = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/companies/${editingCompany.id}/`, formData);
            alert('Company updated successfully!');
            setEditingCompany(null);
            resetForm();
            fetchCompanies();
        } catch (error) {
            console.error('Error updating company:', error);
            alert('Failed to update company. Please try again.');
        }
    };

    const handleDeleteCompany = async (companyId) => {
        if (window.confirm('Are you sure you want to delete this company? This will also remove all associated users and persons.')) {
            try {
                await api.delete(`/companies/${companyId}/`);
                alert('Company deleted successfully!');
                fetchCompanies();
            } catch (error) {
                console.error('Error deleting company:', error);
                alert('Failed to delete company. Please try again.');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            registration_number: '',
            phone: '',
            email: '',
            address: '',
            is_active: true,
        });
    };

    const openEditModal = (company) => {
        setEditingCompany(company);
        setFormData({
            name: company.name || '',
            registration_number: company.registration_number || '',
            phone: company.phone || '',
            email: company.email || '',
            address: company.address || '',
            is_active: company.is_active !== undefined ? company.is_active : true,
        });
    };

    const filteredCompanies = companies.filter(company => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            company.name?.toLowerCase().includes(query) ||
            company.registration_number?.toLowerCase().includes(query) ||
            company.phone?.includes(query)
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
                        <h2 className="text-xl font-semibold text-gray-700 mt-1">Company Management</h2>
                    </div>
                    <button
                        onClick={() => {
                            resetForm();
                            setShowAddModal(true);
                        }}
                        className="btn-primary flex items-center gap-2 px-6 py-2"
                    >
                        <PlusCircleIcon className="w-5 h-5" />
                        Add Company
                    </button>
                </div>

                {/* Search Bar */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <div className="flex-1 relative">
                            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by company name, registration number, or phone..."
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

                {/* Companies Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <th className="px-4 py-3">Company Name</th>
                                    <th className="px-4 py-3">Registration No.</th>
                                    <th className="px-4 py-3">Phone</th>
                                    <th className="px-4 py-3">Email</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredCompanies.map((company) => (
                                    <tr key={company.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium">{company.name}</td>
                                        <td className="px-4 py-3 text-sm font-mono">{company.registration_number || '-'}</td>
                                        <td className="px-4 py-3 text-sm">{company.phone || '-'}</td>
                                        <td className="px-4 py-3 text-sm">{company.email || '-'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${company.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {company.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex justify-center gap-2 flex-wrap">
                                                <button
                                                    onClick={() => {
                                                        setSelectedCompany(company);
                                                        fetchCompanyUsers(company.id);
                                                    }}
                                                    className="text-purple-600 hover:text-purple-800"
                                                    title="View Users"
                                                >
                                                    <UsersIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(company)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="Edit"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCompany(company.id)}
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
                    {filteredCompanies.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No companies found</p>
                        </div>
                    )}
                </div>

                {/* Add/Edit Modal */}
                {(showAddModal || editingCompany) && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {editingCompany ? 'Edit Company' : 'Add New Company'}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setEditingCompany(null);
                                        resetForm();
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <XCircleIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={editingCompany ? handleEditCompany : handleAddCompany}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="label-text">Company Name *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="input-field"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="label-text">Registration Number *</label>
                                        <input
                                            type="text"
                                            value={formData.registration_number}
                                            onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                                            className="input-field"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="label-text">Phone *</label>
                                        <input
                                            type="text"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                                    <div className="md:col-span-2">
                                        <label className="label-text">Address</label>
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            className="input-field"
                                        />
                                    </div>
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
                                        {editingCompany ? 'Update Company' : 'Add Company'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddModal(false);
                                            setEditingCompany(null);
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

                {/* Users Modal */}
                {showUsersModal && selectedCompany && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">
                                    Users for {selectedCompany.name}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowUsersModal(false);
                                        setSelectedCompany(null);
                                        setCompanyUsers([]);
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <XCircleIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            <th className="px-4 py-3">Username</th>
                                            <th className="px-4 py-3">Phone</th>
                                            <th className="px-4 py-3">Role</th>
                                            <th className="px-4 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {companyUsers.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium">{user.username}</td>
                                                <td className="px-4 py-3">{user.phone_number}</td>
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
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {companyUsers.length === 0 && (
                                    <div className="text-center py-8">
                                        <p className="text-gray-500">No users associated with this company</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompanyManagement;