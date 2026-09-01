import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminSidebar from '../components/AdminSidebar';
import ClientSidebar from '../components/ClientSidebar';
import api from '../services/api';
import { SearchIcon, EyeIcon, PlusCircleIcon, XCircleIcon } from '@heroicons/react/outline';

const CompaniesSearch = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const isAdmin = user?.role === 'admin' || user?.is_superuser;

    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newCompany, setNewCompany] = useState({
        name: '',
        registration_number: '',
        phone: '',
        email: '',
        address: '',
    });
    const [adding, setAdding] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            setError('Please enter a search term');
            return;
        }

        setLoading(true);
        setError('');
        setShowAddForm(false);
        setResults([]);

        try {
            const params = new URLSearchParams();
            params.append('search', searchQuery);

            const response = await api.get(`/companies/?${params.toString()}`);
            const data = response.data.results || response.data || [];
            setResults(data);

            if (data.length === 0) {
                setShowAddForm(true);
            }
        } catch (error) {
            console.error('Error searching companies:', error);
            setError('Failed to search. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleViewReport = (companyId) => {
        const path = isAdmin ? '/admin' : '/client';
        navigate(`${path}/enquiries/report/${companyId}?type=company`);
    };

    const handleDelete = async (companyId) => {
        if (window.confirm('Are you sure you want to delete this company?')) {
            try {
                await api.delete(`/companies/${companyId}/`);
                setResults(results.filter(c => c.id !== companyId));
                alert('Company deleted successfully!');
            } catch (error) {
                console.error('Error deleting company:', error);
                alert('Failed to delete company. Please try again.');
            }
        }
    };

    const handleAddCompany = async (e) => {
        e.preventDefault();
        setAdding(true);
        try {
            await api.post('/companies/', newCompany);
            alert('Company added successfully!');
            setShowAddForm(false);
            setNewCompany({ name: '', registration_number: '', phone: '', email: '', address: '' });
            handleSearch(e);
        } catch (error) {
            console.error('Error adding company:', error);
            alert('Failed to add company. Please try again.');
        } finally {
            setAdding(false);
        }
    };

    const Sidebar = isAdmin ? AdminSidebar : ClientSidebar;

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1 ml-64 overflow-y-auto p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-primary">CREDISAFE</h1>
                    <h2 className="text-xl font-semibold text-gray-700 mt-1">Company Search</h2>
                    <p className="text-gray-500 text-sm mt-1">Search by company name, registration number, or phone</p>
                </div>

                {/* Single Search Box */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <form onSubmit={handleSearch}>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-lg"
                                        placeholder="Search by Company Name, Registration Number, or Phone..."
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary px-8 py-3 flex items-center gap-2"
                                >
                                    <SearchIcon className="w-5 h-5" />
                                    {loading ? 'Searching...' : 'Search'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {error && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                {/* "Not Found" Message with Add Button */}
                {showAddForm && !loading && results.length === 0 && searchQuery.trim() && (
                    <div className="bg-white rounded-lg shadow p-8 mb-6 text-center border-2 border-dashed border-gray-300">
                        <div className="text-gray-500 mb-4">
                            <p className="text-xl font-medium text-gray-700">Company Not Found</p>
                            <p className="text-sm mt-2">No company found matching "{searchQuery}"</p>
                        </div>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="btn-primary px-6 py-2 flex items-center gap-2 mx-auto"
                        >
                            <PlusCircleIcon className="w-5 h-5" />
                            Add Company
                        </button>
                    </div>
                )}

                {/* Add Company Form */}
                {showAddForm && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6 border-2 border-primary">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Add New Company</h3>
                            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleAddCompany}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label-text">Company Name *</label>
                                    <input
                                        type="text"
                                        value={newCompany.name}
                                        onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                                        className="input-field"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label-text">Registration Number *</label>
                                    <input
                                        type="text"
                                        value={newCompany.registration_number}
                                        onChange={(e) => setNewCompany({ ...newCompany, registration_number: e.target.value })}
                                        className="input-field"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label-text">Phone *</label>
                                    <input
                                        type="text"
                                        value={newCompany.phone}
                                        onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                                        className="input-field"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label-text">Email</label>
                                    <input
                                        type="email"
                                        value={newCompany.email}
                                        onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                                        className="input-field"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="label-text">Address</label>
                                    <input
                                        type="text"
                                        value={newCompany.address}
                                        onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                                        className="input-field"
                                    />
                                </div>
                            </div>
                            <div className="mt-4 flex gap-3">
                                <button type="submit" disabled={adding} className="btn-primary px-6 py-2">
                                    {adding ? 'Adding...' : 'Add Company'}
                                </button>
                                <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary px-6 py-2">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Results Table with CRUD Actions */}
                {results.length > 0 && (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800">
                                Search Results ({results.length})
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <th className="px-4 py-3">Registration No.</th>
                                        <th className="px-4 py-3">Company Name</th>
                                        <th className="px-4 py-3">Phone</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {results.map((company) => (
                                        <tr key={company.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-mono">{company.registration_number || '-'}</td>
                                            <td className="px-4 py-3 font-medium">{company.name}</td>
                                            <td className="px-4 py-3 text-sm">{company.phone || '-'}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${company.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {company.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleViewReport(company.id)}
                                                        className="text-primary hover:text-primary-dark font-medium text-sm flex items-center gap-1"
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                        View Report
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`${isAdmin ? '/admin' : '/client'}/companies/edit/${company.id}`)}
                                                        className="text-blue-600 hover:text-blue-800 text-sm"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(company.id)}
                                                        className="text-red-600 hover:text-red-800 text-sm"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompaniesSearch;