import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import api from '../services/api';
import {
    PlusCircleIcon,
    PencilIcon,
    TrashIcon,
    EyeIcon,
    XCircleIcon,
    CheckCircleIcon,
    SearchIcon,
} from '@heroicons/react/outline';

const PersonManagement = () => {
    const navigate = useNavigate();
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingPerson, setEditingPerson] = useState(null);
    const [companies, setCompanies] = useState([]);

    const [formData, setFormData] = useState({
        full_name: '',
        national_id: '',
        phone_number: '',
        address: '',
        company_id: '',
        is_verified: false,
        verification_status: 'verified',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [personsRes, companiesRes] = await Promise.all([
                api.get('/persons/'),
                api.get('/companies/'),
            ]);
            setPersons(personsRes.data.results || personsRes.data || []);
            setCompanies(companiesRes.data.results || companiesRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchData();
    };

    const handleAddPerson = async (e) => {
        e.preventDefault();
        try {
            const data = {
                ...formData,
                company: formData.company_id ? parseInt(formData.company_id) : null,
            };
            delete data.company_id;

            await api.post('/persons/', data);
            alert('Person added successfully!');
            setShowAddModal(false);
            resetForm();
            fetchData();
        } catch (error) {
            console.error('Error adding person:', error);
            alert('Failed to add person. Please try again.');
        }
    };

    const handleEditPerson = async (e) => {
        e.preventDefault();
        try {
            const data = {
                ...formData,
                company: formData.company_id ? parseInt(formData.company_id) : null,
            };
            delete data.company_id;

            await api.put(`/persons/${editingPerson.id}/`, data);
            alert('Person updated successfully!');
            setEditingPerson(null);
            resetForm();
            fetchData();
        } catch (error) {
            console.error('Error updating person:', error);
            alert('Failed to update person. Please try again.');
        }
    };

    const handleDeletePerson = async (personId) => {
        if (window.confirm('Are you sure you want to delete this person?')) {
            try {
                await api.delete(`/persons/${personId}/`);
                alert('Person deleted successfully!');
                fetchData();
            } catch (error) {
                console.error('Error deleting person:', error);
                alert('Failed to delete person. Please try again.');
            }
        }
    };

    const handleVerifyPerson = async (personId) => {
        try {
            await api.post(`/persons/${personId}/verify/`);
            alert('Person verified successfully!');
            fetchData();
        } catch (error) {
            console.error('Error verifying person:', error);
            alert('Failed to verify person. Please try again.');
        }
    };

    const handleRejectPerson = async (personId) => {
        try {
            await api.post(`/persons/${personId}/reject/`);
            alert('Person rejected successfully!');
            fetchData();
        } catch (error) {
            console.error('Error rejecting person:', error);
            alert('Failed to reject person. Please try again.');
        }
    };

    const resetForm = () => {
        setFormData({
            full_name: '',
            national_id: '',
            phone_number: '',
            address: '',
            company_id: '',
            is_verified: false,
            verification_status: 'pending',
        });
    };

    const openEditModal = (person) => {
        setEditingPerson(person);
        setFormData({
            full_name: person.full_name || '',
            national_id: person.national_id || '',
            phone_number: person.phone_number || '',
            address: person.address || '',
            company_id: person.company?.id || '',
            is_verified: person.is_verified || false,
            verification_status: person.verification_status || 'pending',
        });
    };

    const filteredPersons = persons.filter(person => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            person.full_name?.toLowerCase().includes(query) ||
            person.national_id?.toLowerCase().includes(query) ||
            person.phone_number?.includes(query)
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
                        <h2 className="text-xl font-semibold text-gray-700 mt-1">Person Management</h2>
                    </div>
                    <button
                        onClick={() => {
                            resetForm();
                            setShowAddModal(true);
                        }}
                        className="btn-primary flex items-center gap-2 px-6 py-2"
                    >
                        <PlusCircleIcon className="w-5 h-5" />
                        Add Person
                    </button>
                </div>

                {/* Search Bar */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <div className="flex-1 relative">
                            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, national ID, or phone..."
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

                {/* Persons Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <th className="px-4 py-3">Full Name</th>
                                    <th className="px-4 py-3">National ID</th>
                                    <th className="px-4 py-3">Phone</th>
                                    {/* <th className="px-4 py-3">Company</th> */}
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredPersons.map((person) => (
                                    <tr key={person.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium">{person.full_name || 'Unknown'}</td>
                                        <td className="px-4 py-3 text-sm font-mono">{person.national_id || '-'}</td>
                                        <td className="px-4 py-3 text-sm">{person.phone_number || '-'}</td>
                                        {/* <td className="px-4 py-3 text-sm">{person.company?.name || '-'}</td> */}
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${person.is_verified ? 'bg-green-100 text-green-800' :
                                                person.verification_status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {person.is_verified ? 'Verified' :
                                                    person.verification_status === 'rejected' ? 'Rejected' : 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex justify-center gap-2 flex-wrap">
                                                {!person.is_verified && person.verification_status !== 'rejected' && (
                                                    <button
                                                        onClick={() => handleVerifyPerson(person.id)}
                                                        className="text-green-600 hover:text-green-800"
                                                        title="Verify"
                                                    >
                                                        <CheckCircleIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {person.verification_status !== 'rejected' && !person.is_verified && (
                                                    <button
                                                        onClick={() => handleRejectPerson(person.id)}
                                                        className="text-red-600 hover:text-red-800"
                                                        title="Reject"
                                                    >
                                                        <XCircleIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openEditModal(person)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="Edit"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePerson(person.id)}
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
                    {filteredPersons.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No persons found</p>
                        </div>
                    )}
                </div>

                {/* Add/Edit Modal */}
                {(showAddModal || editingPerson) && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {editingPerson ? 'Edit Person' : 'Add New Person'}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setEditingPerson(null);
                                        resetForm();
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <XCircleIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={editingPerson ? handleEditPerson : handleAddPerson}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="label-text">Full Name *</label>
                                        <input
                                            type="text"
                                            value={formData.full_name}
                                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                            className="input-field"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="label-text">National ID *</label>
                                        <input
                                            type="text"
                                            value={formData.national_id}
                                            onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
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
                                        <label className="label-text">Company</label>
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
                                    <div className="md:col-span-2">
                                        <label className="label-text">Address</label>
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            className="input-field"
                                        />
                                    </div>
                                    {/* <div className="md:col-span-2">
                                        <label className="label-text">Verification Status</label>
                                        <select
                                            value={formData.verification_status}
                                            onChange={(e) => setFormData({ ...formData, verification_status: e.target.value })}
                                            className="input-field"
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="verified">Verified</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </div> */}
                                </div>

                                <div className="flex gap-3 mt-6 pt-4 border-t">
                                    <button type="submit" className="flex-1 btn-primary py-2 font-semibold">
                                        {editingPerson ? 'Update Person' : 'Add Person'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddModal(false);
                                            setEditingPerson(null);
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

export default PersonManagement;