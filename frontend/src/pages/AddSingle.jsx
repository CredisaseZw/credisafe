import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminSidebar from '../components/AdminSidebar';
import ClientSidebar from '../components/ClientSidebar';
import api from '../services/api';
import {
    PlusCircleIcon,
    XCircleIcon,
    SearchIcon,
    UserIcon,
    OfficeBuildingIcon,
} from '@heroicons/react/outline';

const AddSingle = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const isAdmin = user?.role === 'admin' || user?.is_superuser;

    const [formData, setFormData] = useState({
        credit_type: 'loan',
        amount: '',
        currency: 'usd',
        interest_rate: '0',
        lodge_date: new Date().toISOString().split('T')[0],
        start_date: '',
        due_date: '',
        lender_id: '',
        borrower_id: '',
        instalments: [{ date: '', amount: '' }],
        total_paid: '0',
        balance: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Lender search states
    const [lenderSearch, setLenderSearch] = useState('');
    const [lenderResults, setLenderResults] = useState([]);
    const [searchingLender, setSearchingLender] = useState(false);
    const [selectedLender, setSelectedLender] = useState(null);
    const [showLenderResults, setShowLenderResults] = useState(false);
    const [lenderType, setLenderType] = useState('all'); // 'all', 'person', 'company'

    // Borrower search states
    const [borrowerSearch, setBorrowerSearch] = useState('');
    const [borrowerResults, setBorrowerResults] = useState([]);
    const [searchingBorrower, setSearchingBorrower] = useState(false);
    const [selectedBorrower, setSelectedBorrower] = useState(null);
    const [showBorrowerResults, setShowBorrowerResults] = useState(false);
    const [borrowerType, setBorrowerType] = useState('all'); // 'all', 'person', 'company'

    // Search for lender
    const searchLender = async () => {
        if (!lenderSearch.trim() || lenderSearch.length < 2) {
            setError('Please enter at least 2 characters to search');
            return;
        }

        setSearchingLender(true);
        setError('');

        try {
            const params = new URLSearchParams();
            params.append('search', lenderSearch);

            // Search persons
            const personsResponse = await api.get(`/persons/?${params.toString()}`);
            const persons = personsResponse.data.results || personsResponse.data || [];

            // Search companies
            const companiesResponse = await api.get(`/companies/?${params.toString()}`);
            const companies = companiesResponse.data.results || companiesResponse.data || [];

            // Combine results with type indicator
            let combined = [
                ...persons.map(p => ({ ...p, type: 'person', displayName: p.full_name, idNumber: p.national_id, phone: p.phone_number })),
                ...companies.map(c => ({ ...c, type: 'company', displayName: c.name, idNumber: c.registration_number, phone: c.phone }))
            ];

            // Filter by type if specified
            if (lenderType === 'person') {
                combined = combined.filter(item => item.type === 'person');
            } else if (lenderType === 'company') {
                combined = combined.filter(item => item.type === 'company');
            }

            setLenderResults(combined);
            setShowLenderResults(true);

            if (combined.length === 0) {
                setError('No lenders found. Try a different search term.');
            }
        } catch (error) {
            console.error('Error searching lender:', error);
            setError('Failed to search. Please try again.');
        } finally {
            setSearchingLender(false);
        }
    };

    // Search for borrower
    const searchBorrower = async () => {
        if (!borrowerSearch.trim() || borrowerSearch.length < 2) {
            setError('Please enter at least 2 characters to search');
            return;
        }

        setSearchingBorrower(true);
        setError('');

        try {
            const params = new URLSearchParams();
            params.append('search', borrowerSearch);

            // Search persons
            const personsResponse = await api.get(`/persons/?${params.toString()}`);
            const persons = personsResponse.data.results || personsResponse.data || [];

            // Search companies
            const companiesResponse = await api.get(`/companies/?${params.toString()}`);
            const companies = companiesResponse.data.results || companiesResponse.data || [];

            // Combine results with type indicator
            let combined = [
                ...persons.map(p => ({ ...p, type: 'person', displayName: p.full_name, idNumber: p.national_id, phone: p.phone_number })),
                ...companies.map(c => ({ ...c, type: 'company', displayName: c.name, idNumber: c.registration_number, phone: c.phone }))
            ];

            // Filter by type if specified
            if (borrowerType === 'person') {
                combined = combined.filter(item => item.type === 'person');
            } else if (borrowerType === 'company') {
                combined = combined.filter(item => item.type === 'company');
            }

            setBorrowerResults(combined);
            setShowBorrowerResults(true);

            if (combined.length === 0) {
                setError('No borrowers found. Try a different search term.');
            }
        } catch (error) {
            console.error('Error searching borrower:', error);
            setError('Failed to search. Please try again.');
        } finally {
            setSearchingBorrower(false);
        }
    };

    const handleSelectLender = (item) => {
        setSelectedLender(item);
        setFormData({ ...formData, lender_id: item.id });
        setLenderSearch(item.displayName);
        setShowLenderResults(false);
        // Auto-set lender type
        setLenderType(item.type);
    };

    const handleSelectBorrower = (item) => {
        setSelectedBorrower(item);
        setFormData({ ...formData, borrower_id: item.id });
        setBorrowerSearch(item.displayName);
        setShowBorrowerResults(false);
        // Auto-set borrower type
        setBorrowerType(item.type);
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

        // Validation
        if (!formData.lender_id) {
            setError('Please select a lender');
            return;
        }
        if (!formData.borrower_id) {
            setError('Please select a borrower');
            return;
        }
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const data = {
                credit_type: formData.credit_type,
                amount: parseFloat(formData.amount),
                currency: formData.currency,
                interest_rate: parseFloat(formData.interest_rate) || 0,
                lodge_date: formData.lodge_date,
                start_date: formData.start_date || null,
                due_date: formData.due_date || null,
                lender: parseInt(formData.lender_id),
                borrower: parseInt(formData.borrower_id),
                instalment_amount: formData.instalments.length > 0 && formData.instalments[0].amount
                    ? parseFloat(formData.instalments[0].amount)
                    : null,
            };

            await api.post('/contracts/', data);
            const path = isAdmin ? '/admin' : '/client';
            navigate(`${path}/active-credit`);
            alert('Credit agreement created successfully!');
        } catch (error) {
            console.error('Error creating contract:', error);
            setError(error.response?.data?.detail || 'Failed to create contract. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const Sidebar = isAdmin ? AdminSidebar : ClientSidebar;

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1 ml-64 overflow-y-auto p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-primary">CREDISAFE</h1>
                    <h2 className="text-xl font-semibold text-gray-700 mt-1">Add Single Loan</h2>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <div className="bg-white rounded-lg shadow p-6">
                    <form onSubmit={handleSubmit}>
                        {/* Row 1: Financier Type & Financier Search */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="label-text">Financier Type</label>
                                <select
                                    value={lenderType}
                                    onChange={(e) => setLenderType(e.target.value)}
                                    className="input-field"
                                >
                                    {/* <option value="all">All</option> */}
                                    <option value="person">Individual</option>
                                    <option value="company">Company</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="label-text">Search Financier</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={lenderSearch}
                                            onChange={(e) => setLenderSearch(e.target.value)}
                                            className="input-field pr-10"
                                            placeholder="Search by name, ID, or registration number..."
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    searchLender();
                                                }
                                            }}
                                        />
                                        {selectedLender && (
                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                <span className={`text-xs px-2 py-1 rounded-full ${selectedLender.type === 'person' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {selectedLender.type === 'person' ? 'Individual' : 'Company'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={searchLender}
                                        disabled={searchingLender}
                                        className="btn-primary px-4 py-2 flex items-center gap-1 whitespace-nowrap"
                                    >
                                        <SearchIcon className="w-4 h-4" />
                                        {searchingLender ? 'Searching...' : 'Search'}
                                    </button>
                                </div>
                                {showLenderResults && lenderResults.length > 0 && (
                                    <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto">
                                        {lenderResults.map((item) => (
                                            <div
                                                key={`${item.type}-${item.id}`}
                                                onClick={() => handleSelectLender(item)}
                                                className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex items-center justify-between"
                                            >
                                                <div>
                                                    <p className="font-medium">{item.displayName}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {item.type === 'person' ? `ID: ${item.idNumber}` : `Reg: ${item.idNumber}`} | {item.phone}
                                                    </p>
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded-full ${item.type === 'person' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {item.type === 'person' ? 'Individual' : 'Company'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {selectedLender && (
                                    <div className="mt-2 text-sm text-green-600">
                                        Selected: {selectedLender.displayName} ({selectedLender.type === 'person' ? 'Individual' : 'Company'})
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedLender(null);
                                                setFormData({ ...formData, lender_id: '' });
                                                setLenderSearch('');
                                                setShowLenderResults(false);
                                            }}
                                            className="ml-2 text-red-500 hover:text-red-700"
                                        >
                                            <XCircleIcon className="w-4 h-4 inline" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 2: Data Source Name & Position */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="md:col-span-2">
                                <label className="label-text">Data Source Name</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="input-field flex-1"
                                        placeholder="Enter data source name"
                                    />
                                    {/* <button
                                        type="button"
                                        className="btn-secondary whitespace-nowrap flex items-center gap-1"
                                    >
                                        <PlusCircleIcon className="w-4 h-4" />
                                        Add Client User
                                    </button> */}
                                </div>
                            </div>
                            <div>
                                <label className="label-text">Position</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Position"
                                />
                            </div>
                        </div>

                        {/* Row 3: Debtor Type & Debtor Search */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div>
                                <label className="label-text">Debtor Type</label>
                                <select
                                    value={borrowerType}
                                    onChange={(e) => setBorrowerType(e.target.value)}
                                    className="input-field"
                                >
                                    {/* <option value="all">All</option> */}
                                    <option value="person">Individual</option>
                                    <option value="company">Company</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="label-text">Search Debtor</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={borrowerSearch}
                                            onChange={(e) => setBorrowerSearch(e.target.value)}
                                            className="input-field pr-10"
                                            placeholder="Search by name, ID, or registration number..."
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    searchBorrower();
                                                }
                                            }}
                                        />
                                        {selectedBorrower && (
                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                <span className={`text-xs px-2 py-1 rounded-full ${selectedBorrower.type === 'person' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {selectedBorrower.type === 'person' ? 'Individual' : 'Company'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={searchBorrower}
                                        disabled={searchingBorrower}
                                        className="btn-primary px-4 py-2 flex items-center gap-1 whitespace-nowrap"
                                    >
                                        <SearchIcon className="w-4 h-4" />
                                        {searchingBorrower ? 'Searching...' : 'Search'}
                                    </button>
                                </div>
                                {showBorrowerResults && borrowerResults.length > 0 && (
                                    <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto">
                                        {borrowerResults.map((item) => (
                                            <div
                                                key={`${item.type}-${item.id}`}
                                                onClick={() => handleSelectBorrower(item)}
                                                className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex items-center justify-between"
                                            >
                                                <div>
                                                    <p className="font-medium">{item.displayName}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {item.type === 'person' ? `ID: ${item.idNumber}` : `Reg: ${item.idNumber}`} | {item.phone}
                                                    </p>
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded-full ${item.type === 'person' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {item.type === 'person' ? 'Individual' : 'Company'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {selectedBorrower && (
                                    <div className="mt-2 text-sm text-green-600">
                                        Selected: {selectedBorrower.displayName} ({selectedBorrower.type === 'person' ? 'Individual' : 'Company'})
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedBorrower(null);
                                                setFormData({ ...formData, borrower_id: '' });
                                                setBorrowerSearch('');
                                                setShowBorrowerResults(false);
                                            }}
                                            className="ml-2 text-red-500 hover:text-red-700"
                                        >
                                            <XCircleIcon className="w-4 h-4 inline" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <hr className="my-6" />

                        {/* Row 4: Agreement Number & Loan Type */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="label-text">Agreement Number</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Auto-generated"
                                    disabled
                                />
                            </div>
                            <div>
                                <label className="label-text">Loan Type</label>
                                <select
                                    name="credit_type"
                                    value={formData.credit_type}
                                    onChange={handleChange}
                                    className="input-field"
                                >
                                    <option value="loan">Loan</option>
                                    <option value="cash">Cash</option>
                                    <option value="goods">Goods</option>
                                    <option value="service">Service</option>
                                    <option value="mukando">Mukando</option>
                                </select>
                            </div>
                        </div>

                        {/* Row 5: Currency & Total Loan */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="label-text">Currency</label>
                                <select
                                    name="currency"
                                    value={formData.currency}
                                    onChange={handleChange}
                                    className="input-field"
                                >
                                    <option value="usd">USD</option>
                                    <option value="rand">ZAR</option>
                                    <option value="zwl">ZWL</option>
                                </select>
                            </div>
                            <div>
                                <label className="label-text">Total Loan</label>
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
                        </div>

                        {/* Row 6: Instalment Schedule */}
                        <div className="mb-4">
                            <label className="label-text">Instalment Schedule</label>
                            {formData.instalments.map((instalment, index) => (
                                <div key={index} className="flex gap-4 mb-2 items-end">
                                    <div className="flex-1">
                                        <input
                                            type="date"
                                            value={instalment.date}
                                            onChange={(e) => handleInstalmentChange(index, 'date', e.target.value)}
                                            className="input-field"
                                            placeholder="Instalment Date"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="number"
                                            value={instalment.amount}
                                            onChange={(e) => handleInstalmentChange(index, 'amount', e.target.value)}
                                            className="input-field"
                                            placeholder="Instalment Amount"
                                            step="0.01"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeInstalment(index)}
                                        className="text-red-500 hover:text-red-700 mb-1"
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

                        {/* Row 7: Total Paid & Balance */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="label-text">Total Paid to date</label>
                                <input
                                    type="number"
                                    name="total_paid"
                                    value={formData.total_paid}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="0.00"
                                    step="0.01"
                                />
                            </div>
                            <div>
                                <label className="label-text">Balance</label>
                                <input
                                    type="number"
                                    name="balance"
                                    value={formData.balance}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="0.00"
                                    step="0.01"
                                />
                            </div>
                        </div>

                        {/* Row 8: Lodge Date, Start Date & End Date */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            {/* <div>
                                <label className="label-text">Lodge Date</label>
                                <input
                                    type="date"
                                    name="lodge_date"
                                    value={formData.lodge_date}
                                    onChange={handleChange}
                                    className="input-field"
                                    required
                                />
                            </div> */}
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
                                    name="due_date"
                                    value={formData.due_date}
                                    onChange={handleChange}
                                    className="input-field"
                                />
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex gap-3 pt-4 border-t">
                            <button
                                type="submit"
                                disabled={loading || !selectedLender || !selectedBorrower}
                                className="flex-1 btn-primary py-3 font-semibold"
                            >
                                {loading ? 'Uploading...' : 'Upload'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const path = isAdmin ? '/admin' : '/client';
                                    navigate(`${path}/active-credit`);
                                }}
                                className="flex-1 btn-secondary py-3 font-semibold"
                            >
                                Cancel
                            </button>
                        </div>
                        {(!selectedLender || !selectedBorrower) && (
                            <p className="text-sm text-red-500 mt-2">
                                Please select both a financier and a debtor before submitting.
                            </p>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddSingle;