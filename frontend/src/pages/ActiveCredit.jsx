import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminSidebar from '../components/AdminSidebar';
import ClientSidebar from '../components/ClientSidebar';
import api from '../services/api';
import {
    PlusCircleIcon,
    EyeIcon,
    SearchIcon,
    XCircleIcon,
    CheckCircleIcon,
} from '@heroicons/react/outline';

const ActiveCredit = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const isAdmin = user?.role === 'admin' || user?.is_superuser;

    const [stats, setStats] = useState(null);
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterArrears, setFilterArrears] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedContract, setSelectedContract] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statsRes, contractsRes] = await Promise.all([
                api.get('/dashboard/stats/'),
                api.get('/contracts/'),
            ]);
            setStats(statsRes.data);
            setContracts(contractsRes.data.results || contractsRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleView = (contract) => {
        setSelectedContract(contract);
        setShowViewModal(true);
    };

    const handleSettle = async (contract) => {
        if (window.confirm(`Are you sure you want to settle agreement #${contract.id}?`)) {
            try {
                await api.post(`/contracts/${contract.id}/settle/`);
                fetchData();
                alert('Contract settled successfully!');
            } catch (error) {
                console.error('Error settling contract:', error);
                alert('Failed to settle contract. Please try again.');
            }
        }
    };

    const filteredContracts = contracts.filter(contract => {
        if (filterArrears) {
            return contract.status === 'active' && new Date(contract.due_date) < new Date();
        }
        return true;
    }).filter(contract => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            contract.id?.toString().includes(query) ||
            contract.borrower_name?.toLowerCase().includes(query) ||
            contract.borrower_phone?.includes(query) ||
            contract.lender_name?.toLowerCase().includes(query)
        );
    });

    const Sidebar = isAdmin ? AdminSidebar : ClientSidebar;
    const basePath = isAdmin ? '/admin' : '/client';

    if (loading) {
        return (
            <div className="flex h-screen bg-gray-50">
                <Sidebar />
                <div className="flex-1 ml-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1 ml-64 overflow-y-auto p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-primary">CREDISAFE</h1>
                    <h2 className="text-xl font-semibold text-gray-700 mt-1">ACTIVE CREDIT AGREEMENTS</h2>
                </div>

                {/* Stats Cards - As per design */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-primary">
                        <p className="text-sm text-gray-500">Active Credit Agreements</p>
                        <p className="text-2xl font-bold text-gray-800">{stats?.total_active_contracts || 0}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                        <p className="text-sm text-gray-500">Active Accounts in Arrears</p>
                        <p className="text-2xl font-bold text-gray-800">
                            {stats?.active_accounts_in_arrears || 0} ({stats?.arrears_percentage || 0}%)
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                        <p className="text-sm text-gray-500">Active Credit Value</p>
                        <p className="text-2xl font-bold text-gray-800">
                            ${stats?.active_credit_value?.toLocaleString() || '0'}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                        <p className="text-sm text-gray-500">Arrears Value</p>
                        <p className="text-2xl font-bold text-gray-800">
                            ${stats?.arrears_value?.toLocaleString() || '0'} ({stats?.arrears_value_percentage || 0}%)
                        </p>
                    </div>
                </div>

                {/* Search and Filter */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by Agreement Number, Debtor, or Lender..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => setFilterArrears(!filterArrears)}
                                className={`px-4 py-2 rounded-lg transition-all duration-200 ${filterArrears
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                            >
                                In Arrears
                            </button>
                            <button
                                onClick={fetchData}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200"
                            >
                                Refresh
                            </button>
                            <button
                                onClick={() => navigate(`${basePath}/add-single`)}
                                className="px-4 py-2 btn-primary flex items-center gap-2"
                            >
                                <PlusCircleIcon className="w-5 h-5" />
                                Add Single
                            </button>
                            <button
                                onClick={() => alert('Add Multiple functionality coming soon')}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 flex items-center gap-2"
                            >
                                <PlusCircleIcon className="w-5 h-5" />
                                Add Multiple
                            </button>
                        </div>
                    </div>
                </div>

                {/* Contracts Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <th className="px-4 py-3">Lodge Date</th>
                                    <th className="px-4 py-3">Agreement No.</th>
                                    <th className="px-4 py-3">Lender</th>
                                    <th className="px-4 py-3">Debtor</th>
                                    <th className="px-4 py-3">Currency</th>
                                    <th className="px-4 py-3">Loan Taken</th>
                                    <th className="px-4 py-3">Balance Outstanding</th>
                                    <th className="px-4 py-3">Instalment Amount</th>
                                    <th className="px-4 py-3">Start Date</th>
                                    <th className="px-4 py-3">End Date</th>
                                    <th className="px-4 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredContracts.map((contract) => {
                                    const isInArrears = contract.status === 'active' && new Date(contract.due_date) < new Date();
                                    const rowClass = isInArrears ? 'bg-red-50' : '';

                                    return (
                                        <tr key={contract.id} className={`hover:bg-gray-50 ${rowClass}`}>
                                            <td className="px-4 py-3 text-sm">
                                                {contract.lodge_date ? new Date(contract.lodge_date).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-mono">#{contract.id}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <div>
                                                    <p className="font-medium">{contract.lender_name || 'Unknown'}</p>
                                                    <p className="text-xs text-gray-500">{contract.lender_phone || ''}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <div>
                                                    <p className="font-medium">{contract.borrower_name || 'Unknown'}</p>
                                                    <p className="text-xs text-gray-500">{contract.borrower_phone || ''}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium">{contract.currency?.toUpperCase() || 'USD'}</td>
                                            <td className="px-4 py-3 text-sm font-medium">
                                                {contract.currency?.toUpperCase()} {parseFloat(contract.amount).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-primary">
                                                {contract.currency?.toUpperCase()} {parseFloat(contract.amount).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {contract.instalment_amount ?
                                                    `${contract.currency?.toUpperCase()} ${parseFloat(contract.instalment_amount).toFixed(2)}` :
                                                    '-'
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {contract.start_date ? new Date(contract.start_date).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {contract.due_date ? new Date(contract.due_date).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => handleView(contract)}
                                                    className="text-primary hover:text-primary-dark font-medium text-sm flex items-center gap-1 mx-auto"
                                                >
                                                    <EyeIcon className="w-4 h-4" />
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {filteredContracts.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No active credit agreements found</p>
                        </div>
                    )}
                </div>

                {/* View Modal - Single Page Report */}
                {showViewModal && selectedContract && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">Loan Particulars</h2>
                                <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <XCircleIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">Agreement No.</p>
                                    <p className="font-medium">#{selectedContract.id}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Status</p>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedContract.status === 'active' ? 'bg-green-100 text-green-800' :
                                        selectedContract.status === 'settled' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                        {selectedContract.status?.toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Lender</p>
                                    <p className="font-medium">{selectedContract.lender_name || 'Unknown'}</p>
                                    <p className="text-sm text-gray-500">{selectedContract.lender_phone}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Borrower</p>
                                    <p className="font-medium">{selectedContract.borrower_name || 'Unknown'}</p>
                                    <p className="text-sm text-gray-500">{selectedContract.borrower_phone}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Amount</p>
                                    <p className="font-medium">{selectedContract.currency?.toUpperCase()} {parseFloat(selectedContract.amount).toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Credit Type</p>
                                    <p className="font-medium capitalize">{selectedContract.credit_type || 'Loan'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Lodge Date</p>
                                    <p>{selectedContract.lodge_date ? new Date(selectedContract.lodge_date).toLocaleDateString() : '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Start Date</p>
                                    <p>{selectedContract.start_date ? new Date(selectedContract.start_date).toLocaleDateString() : '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">End Date</p>
                                    <p>{selectedContract.due_date ? new Date(selectedContract.due_date).toLocaleDateString() : '-'}</p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500">Instalment Amount</p>
                                    <p>{selectedContract.instalment_amount ?
                                        `${selectedContract.currency?.toUpperCase()} ${parseFloat(selectedContract.instalment_amount).toFixed(2)}` :
                                        '-'
                                    }</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Interest Rate</p>
                                    <p>{selectedContract.interest_rate || 0}%</p>
                                </div>
                            </div>

                            {selectedContract.status === 'active' && (
                                <div className="flex gap-3 mt-6 pt-4 border-t">
                                    <button
                                        onClick={() => {
                                            handleSettle(selectedContract);
                                            setShowViewModal(false);
                                        }}
                                        className="flex-1 btn-primary py-2"
                                    >
                                        <CheckCircleIcon className="w-5 h-5 inline mr-2" />
                                        Settle Loan
                                    </button>
                                    <button
                                        onClick={() => setShowViewModal(false)}
                                        className="flex-1 btn-secondary py-2"
                                    >
                                        Close
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActiveCredit;