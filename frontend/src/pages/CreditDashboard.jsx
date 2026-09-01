import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import {
    CreditCardIcon,
    CurrencyDollarIcon,
    UserGroupIcon,
    PlusCircleIcon,
    CheckCircleIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    SearchIcon,
    EyeIcon,
    XCircleIcon,
} from '@heroicons/react/outline';

// Main Credit Dashboard - Matches the design
const CreditDashboard = () => {
    const [stats, setStats] = useState(null);
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedContract, setSelectedContract] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterArrears, setFilterArrears] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [statsRes, contractsRes] = await Promise.all([
                api.get('/dashboard/stats/'),
                api.get('/contracts/'),
            ]);
            setStats(statsRes.data);
            setContracts(contractsRes.data.results || contractsRes.data || []);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        // Filter contracts based on search query
        const filtered = contracts.filter(contract => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return (
                contract.id?.toString().includes(query) ||
                contract.borrower?.full_name?.toLowerCase().includes(query) ||
                contract.borrower?.phone_number?.includes(query) ||
                contract.lender?.full_name?.toLowerCase().includes(query)
            );
        });
        return filtered;
    };

    const filteredContracts = handleSearch();

    // Filter for arrears if toggled
    const displayContracts = filterArrears
        ? filteredContracts.filter(c => c.status === 'active' && new Date(c.due_date) < new Date())
        : filteredContracts;

    const handleView = (contract) => {
        setSelectedContract(contract);
        setShowViewModal(true);
    };

    const handleSettle = async (contract) => {
        if (window.confirm(`Are you sure you want to settle agreement #${contract.id}?`)) {
            try {
                await api.post(`/contracts/${contract.id}/settle/`);
                fetchDashboardData();
                alert('Contract settled successfully!');
            } catch (error) {
                console.error('Error settling contract:', error);
                alert('Failed to settle contract. Please try again.');
            }
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-gray-50 items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Calculate stats for display
    const totalActive = stats?.total_active_contracts || 0;
    const arrearsCount = stats?.active_accounts_in_arrears || 0;
    const arrearsPercentage = stats?.arrears_percentage || 0;
    const activeCreditValue = stats?.active_credit_value || 0;
    const arrearsValue = stats?.arrears_value || 0;
    const arrearsValuePercentage = stats?.arrears_value_percentage || 0;

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1 ml-64 overflow-y-auto p-8">
                {/* Header with CREDISAFE branding */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-primary">CREDISAFE</h1>
                    <h2 className="text-xl font-semibold text-gray-700 mt-1">ACTIVE CREDIT AGREEMENTS</h2>
                </div>

                {/* Stats Cards - Matches design with Arrears */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-primary">
                        <p className="text-sm text-gray-500">Active Credit Agreements</p>
                        <p className="text-2xl font-bold text-gray-800">{totalActive}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                        <p className="text-sm text-gray-500">Active Accounts in Arrears</p>
                        <p className="text-2xl font-bold text-gray-800">
                            {arrearsCount} <span className="text-sm font-normal text-gray-500">({arrearsPercentage}%)</span>
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                        <p className="text-sm text-gray-500">Active Credit Value</p>
                        <p className="text-2xl font-bold text-gray-800">
                            ${activeCreditValue.toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                        <p className="text-sm text-gray-500">Arrears Value</p>
                        <p className="text-2xl font-bold text-gray-800">
                            ${arrearsValue.toLocaleString()} <span className="text-sm font-normal text-gray-500">({arrearsValuePercentage}%)</span>
                        </p>
                    </div>
                </div>

                {/* Search and Filter Bar - Matches design */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by Debtor, Agreement Number, or Phone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilterArrears(!filterArrears)}
                                className={`px-4 py-2 rounded-lg transition-all duration-200 ${filterArrears
                                        ? 'bg-primary text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                            >
                                In Arrears
                            </button>
                            <button
                                onClick={fetchDashboardData}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200"
                            >
                                Refresh
                            </button>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-4 py-2 btn-primary flex items-center gap-2"
                            >
                                <PlusCircleIcon className="w-5 h-5" />
                                Add Single
                            </button>
                        </div>
                    </div>
                </div>

                {/* Contracts Table - Matches design exactly */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <th className="px-4 py-3">Lodge Date</th>
                                    <th className="px-4 py-3">Agreement No.</th>
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
                                {displayContracts.map((contract) => {
                                    const isInArrears = contract.status === 'active' && new Date(contract.due_date) < new Date();
                                    const rowClass = isInArrears ? 'bg-red-50' : '';

                                    return (
                                        <tr key={contract.id} className={`hover:bg-gray-50 ${rowClass}`}>
                                            <td className="px-4 py-3 text-sm">
                                                {contract.lodge_date ? new Date(contract.lodge_date).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-mono">#{contract.id}</td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium text-sm">{contract.borrower?.full_name || 'Unknown'}</p>
                                                    <p className="text-xs text-gray-500">{contract.borrower?.phone_number || ''}</p>
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
                                                {contract.end_date ? new Date(contract.end_date).toLocaleDateString() : '-'}
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

                    {displayContracts.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No active credit agreements found</p>
                        </div>
                    )}
                </div>

                {/* View Modal - Shows loan particulars */}
                {showViewModal && selectedContract && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">Loan Particulars</h2>
                                <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <XCircleIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
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
                                        <p className="font-medium">{selectedContract.lender?.full_name || 'Unknown'}</p>
                                        <p className="text-sm text-gray-500">{selectedContract.lender?.phone_number}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Borrower</p>
                                        <p className="font-medium">{selectedContract.borrower?.full_name || 'Unknown'}</p>
                                        <p className="text-sm text-gray-500">{selectedContract.borrower?.phone_number}</p>
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
                                        <p>{selectedContract.end_date ? new Date(selectedContract.end_date).toLocaleDateString() : '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Due Date</p>
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
                    </div>
                )}

                {/* Add Single Modal - Matches design with instalment dates */}
                {showAddModal && (
                    <AddSingleModal
                        isOpen={showAddModal}
                        onClose={() => setShowAddModal(false)}
                        onSuccess={fetchDashboardData}
                    />
                )}
            </div>
        </div>
    );
};

// Add Single Modal Component - Matches design with instalment dates
const AddSingleModal = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        credit_type: 'loan',
        amount: '',
        currency: 'usd',
        interest_rate: '0',
        lodge_date: new Date().toISOString().split('T')[0],
        start_date: '',
        end_date: '',
        due_date: '',
        lender: '',
        borrower: '',
        instalments: [{ date: '', amount: '' }],
    });
    const [loading, setLoading] = useState(false);
    const [persons, setPersons] = useState([]);

    useEffect(() => {
        if (isOpen) {
            fetchPersons();
        }
    }, [isOpen]);

    const fetchPersons = async () => {
        try {
            const response = await api.get('/persons/');
            setPersons(response.data.results || response.data || []);
        } catch (error) {
            console.error('Error fetching persons:', error);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleInstalmentChange = (index, field, value) => {
        const newInstalments = [...formData.instalments];
        newInstalments[index][field] = value;
        setFormData({ ...formData, instalments: newInstalments });
    };

    const addInstalment = () => {
        setFormData({
            ...formData,
            instalments: [...formData.instalments, { date: '', amount: '' }]
        });
    };

    const removeInstalment = (index) => {
        if (formData.instalments.length > 1) {
            const newInstalments = formData.instalments.filter((_, i) => i !== index);
            setFormData({ ...formData, instalments: newInstalments });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = {
                ...formData,
                amount: parseFloat(formData.amount),
                interest_rate: parseFloat(formData.interest_rate) || 0,
                instalment_amount: formData.instalments.length > 0 && formData.instalments[0].amount
                    ? parseFloat(formData.instalments[0].amount)
                    : null,
                lender: parseInt(formData.lender),
                borrower: parseInt(formData.borrower),
            };
            // Remove instalments array as it's not in the model
            delete data.instalments;

            await api.post('/contracts/', data);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating contract:', error);
            alert('Failed to create contract. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Add Single Credit Agreement</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label-text">Credit Type</label>
                            <select
                                name="credit_type"
                                value={formData.credit_type}
                                onChange={handleChange}
                                className="input-field"
                                required
                            >
                                <option value="loan">Loan</option>
                                <option value="cash">Cash</option>
                                <option value="goods">Goods</option>
                                <option value="service">Service</option>
                                <option value="mukando">Mukando</option>
                            </select>
                        </div>

                        <div>
                            <label className="label-text">Currency</label>
                            <select
                                name="currency"
                                value={formData.currency}
                                onChange={handleChange}
                                className="input-field"
                                required
                            >
                                <option value="usd">USD</option>
                                <option value="rand">ZAR</option>
                                <option value="zwl">ZWL</option>
                            </select>
                        </div>

                        <div>
                            <label className="label-text">Amount</label>
                            <input
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="0.00"
                                required
                                step="0.01"
                            />
                        </div>

                        <div>
                            <label className="label-text">Interest Rate (%)</label>
                            <input
                                type="number"
                                name="interest_rate"
                                value={formData.interest_rate}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="0"
                                step="0.01"
                            />
                        </div>

                        <div>
                            <label className="label-text">Lender</label>
                            <select
                                name="lender"
                                value={formData.lender}
                                onChange={handleChange}
                                className="input-field"
                                required
                            >
                                <option value="">Select Lender</option>
                                {persons.map((person) => (
                                    <option key={person.id} value={person.id}>
                                        {person.full_name} ({person.phone_number})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="label-text">Borrower</label>
                            <select
                                name="borrower"
                                value={formData.borrower}
                                onChange={handleChange}
                                className="input-field"
                                required
                            >
                                <option value="">Select Borrower</option>
                                {persons.map((person) => (
                                    <option key={person.id} value={person.id}>
                                        {person.full_name} ({person.phone_number})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="label-text">Lodge Date</label>
                            <input
                                type="date"
                                name="lodge_date"
                                value={formData.lodge_date}
                                onChange={handleChange}
                                className="input-field"
                                required
                            />
                        </div>

                        <div>
                            <label className="label-text">Start Date</label>
                            <input
                                type="date"
                                name="start_date"
                                value={formData.start_date}
                                onChange={handleChange}
                                className="input-field"
                            />
                        </div>

                        <div>
                            <label className="label-text">End Date</label>
                            <input
                                type="date"
                                name="end_date"
                                value={formData.end_date}
                                onChange={handleChange}
                                className="input-field"
                            />
                        </div>

                        <div>
                            <label className="label-text">Due Date</label>
                            <input
                                type="date"
                                name="due_date"
                                value={formData.due_date}
                                onChange={handleChange}
                                className="input-field"
                            />
                        </div>
                    </div>

                    {/* Instalment Dates and Amounts - Matches design */}
                    <div className="mt-6 pt-4 border-t">
                        <h3 className="font-semibold text-gray-700 mb-3">Instalment Schedule</h3>
                        {formData.instalments.map((instalment, index) => (
                            <div key={index} className="flex gap-4 mb-3 items-end">
                                <div className="flex-1">
                                    <label className="label-text">Instalment Date</label>
                                    <input
                                        type="date"
                                        value={instalment.date}
                                        onChange={(e) => handleInstalmentChange(index, 'date', e.target.value)}
                                        className="input-field"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="label-text">Instalment Amount</label>
                                    <input
                                        type="number"
                                        value={instalment.amount}
                                        onChange={(e) => handleInstalmentChange(index, 'amount', e.target.value)}
                                        className="input-field"
                                        placeholder="0.00"
                                        step="0.01"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeInstalment(index)}
                                    className="mb-1 text-red-500 hover:text-red-700"
                                    disabled={formData.instalments.length <= 1}
                                >
                                    <XCircleIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addInstalment}
                            className="text-primary hover:text-primary-dark font-medium flex items-center gap-1 mt-2"
                        >
                            <PlusCircleIcon className="w-5 h-5" />
                            Add Instalment Date & Amount
                        </button>
                    </div>

                    <div className="flex gap-3 mt-6 pt-4 border-t">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 btn-primary py-3 font-semibold"
                        >
                            {loading ? 'Creating...' : 'Create Credit Agreement'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 btn-secondary py-3 font-semibold"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreditDashboard;