import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminSidebar from '../components/AdminSidebar';
import ClientSidebar from '../components/ClientSidebar';
import api from '../services/api';
import { SearchIcon, EyeIcon, PlusCircleIcon, XCircleIcon } from '@heroicons/react/outline';

const IndividualsSearch = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const isAdmin = user?.role === 'admin' || user?.is_superuser;

    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newIndividual, setNewIndividual] = useState({
        full_name: '',
        national_id: '',
        phone_number: '',
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

            const response = await api.get(`/persons/?${params.toString()}`);
            const data = response.data.results || response.data || [];
            setResults(data);

            if (data.length === 0) {
                setShowAddForm(true);
            }
        } catch (error) {
            console.error('Error searching individuals:', error);
            setError('Failed to search. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleViewReport = (personId) => {
        const path = isAdmin ? '/admin' : '/client';
        navigate(`${path}/enquiries/report/${personId}?type=individual`);
    };

    const handleDelete = async (personId) => {
        if (window.confirm('Are you sure you want to delete this individual?')) {
            try {
                await api.delete(`/persons/${personId}/`);
                setResults(results.filter(p => p.id !== personId));
                alert('Individual deleted successfully!');
            } catch (error) {
                console.error('Error deleting individual:', error);
                alert('Failed to delete individual. Please try again.');
            }
        }
    };

    const handleAddIndividual = async (e) => {
        e.preventDefault();
        setAdding(true);
        try {
            await api.post('/persons/', newIndividual);
            alert('Individual added successfully!');
            setShowAddForm(false);
            setNewIndividual({ full_name: '', national_id: '', phone_number: '', address: '' });
            // Refresh search
            handleSearch(e);
        } catch (error) {
            console.error('Error adding individual:', error);
            alert('Failed to add individual. Please try again.');
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
                    <h2 className="text-xl font-semibold text-gray-700 mt-1">Individual Search</h2>
                    <p className="text-gray-500 text-sm mt-1">Search by name, national ID, or phone number</p>
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
                                        placeholder="Search by Name, National ID, or Phone Number..."
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
                            <p className="text-xl font-medium text-gray-700">Individual Not Found</p>
                            <p className="text-sm mt-2">No individual found matching "{searchQuery}"</p>
                        </div>
                        {/* <button
                            onClick={() => setShowAddForm(true)}
                            className="btn-primary px-6 py-2 flex items-center gap-2 mx-auto"
                        >
                            <PlusCircleIcon className="w-5 h-5" />
                            Add Individual
                        </button> */}
                    </div>
                )}

                {/* Add Individual Form */}
                {showAddForm && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6 border-2 border-primary">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Add Individual?</h3>
                            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleAddIndividual}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label-text">Full Name *</label>
                                    <input
                                        type="text"
                                        value={newIndividual.full_name}
                                        onChange={(e) => setNewIndividual({ ...newIndividual, full_name: e.target.value })}
                                        className="input-field"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label-text">National ID *</label>
                                    <input
                                        type="text"
                                        value={newIndividual.national_id}
                                        onChange={(e) => setNewIndividual({ ...newIndividual, national_id: e.target.value })}
                                        className="input-field"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label-text">Phone Number *</label>
                                    <input
                                        type="text"
                                        value={newIndividual.phone_number}
                                        onChange={(e) => setNewIndividual({ ...newIndividual, phone_number: e.target.value })}
                                        className="input-field"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label-text">Address</label>
                                    <input
                                        type="text"
                                        value={newIndividual.address}
                                        onChange={(e) => setNewIndividual({ ...newIndividual, address: e.target.value })}
                                        className="input-field"
                                    />
                                </div>
                            </div>
                            <div className="mt-4 flex gap-3">
                                <button type="submit" disabled={adding} className="btn-primary px-6 py-2">
                                    {adding ? 'Adding...' : 'Add Individual'}
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
                                        <th className="px-4 py-3">National ID</th>
                                        <th className="px-4 py-3">Full Name</th>
                                        <th className="px-4 py-3">Phone</th>
                                        {/* <th className="px-4 py-3">Status</th> */}
                                        <th className="px-4 py-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {results.map((person) => (
                                        <tr key={person.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-mono">{person.national_id || '-'}</td>
                                            <td className="px-4 py-3 font-medium">{person.full_name || 'Unknown'}</td>
                                            <td className="px-4 py-3 text-sm">{person.phone_number || '-'}</td>

                                            <td className="px-4 py-3 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleViewReport(person.id)}
                                                        className="text-primary hover:text-primary-dark font-medium text-sm flex items-center gap-1"
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                        View Report
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`${isAdmin ? '/admin' : '/client'}/individuals/edit/${person.id}`)}
                                                        className="text-blue-600 hover:text-blue-800 text-sm"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(person.id)}
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

export default IndividualsSearch;