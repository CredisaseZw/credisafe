import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminSidebar from '../components/AdminSidebar';
import ClientSidebar from '../components/ClientSidebar';
import api from '../services/api';
import {
    XCircleIcon,
    PrinterIcon,
    FlagIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    CreditCardIcon,
    CurrencyDollarIcon,
    UserGroupIcon,
    DocumentTextIcon,
} from '@heroicons/react/outline';

const CreditReport = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.is_superuser;
    const type = new URLSearchParams(location.search).get('type') || 'individual';
    const printRef = useRef();

    const [entity, setEntity] = useState(null);
    const [contracts, setContracts] = useState([]);
    const [creditHistory, setCreditHistory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchEntityData();
    }, [id, type]);

    const fetchEntityData = async () => {
        setLoading(true);
        setError('');
        try {
            let entityResponse;
            let contractsResponse;
            let historyResponse;

            if (type === 'individual') {
                entityResponse = await api.get(`/persons/${id}/`);
                contractsResponse = await api.get(`/persons/${id}/contracts/`);
                try {
                    historyResponse = await api.get(`/persons/${id}/credit_history/`);
                } catch (e) {
                    // Credit history might not exist
                }
                setEntity(entityResponse.data);
                setContracts(contractsResponse.data || []);
                setCreditHistory(historyResponse?.data || null);
            } else {
                entityResponse = await api.get(`/companies/${id}/`);
                contractsResponse = await api.get(`/contracts/?company=${id}`);
                setEntity(entityResponse.data);
                setContracts(contractsResponse.data.results || contractsResponse.data || []);
                // Companies don't have credit history directly
                setCreditHistory(null);
            }
        } catch (error) {
            console.error('Error fetching entity:', error);
            setError('Failed to load credit report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const originalTitle = document.title;
        document.title = `Credit Report - ${entity?.full_name || entity?.name || 'Entity'}`;

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            alert('Please allow popups for printing.');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Credit Report - ${entity?.full_name || entity?.name || 'Entity'}</title>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        @media print {
                            body { 
                                font-family: 'Inter', sans-serif;
                                padding: 40px;
                                background: white;
                            }
                            .no-print { display: none !important; }
                            .print-container { 
                                max-width: 1000px; 
                                margin: 0 auto;
                                padding: 20px;
                            }
                            .print-header {
                                border-bottom: 2px solid #176987;
                                padding-bottom: 20px;
                                margin-bottom: 30px;
                            }
                            .print-header h1 {
                                color: #176987;
                                font-size: 28px;
                                font-weight: 700;
                            }
                            .print-header .subtitle {
                                color: #666;
                                font-size: 14px;
                            }
                            .print-section {
                                margin-bottom: 30px;
                            }
                            .print-section-title {
                                font-size: 18px;
                                font-weight: 600;
                                color: #1e293b;
                                margin-bottom: 15px;
                                border-bottom: 1px solid #e2e8f0;
                                padding-bottom: 8px;
                            }
                            .print-grid {
                                display: grid;
                                grid-template-columns: 1fr 1fr;
                                gap: 15px;
                            }
                            .print-label {
                                font-size: 12px;
                                color: #94a3b8;
                                font-weight: 500;
                            }
                            .print-value {
                                font-size: 14px;
                                font-weight: 500;
                                color: #1e293b;
                            }
                            .print-table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 10px;
                            }
                            .print-table th {
                                background: #f8fafc;
                                text-align: left;
                                padding: 10px 12px;
                                font-size: 11px;
                                font-weight: 600;
                                color: #64748b;
                                text-transform: uppercase;
                                border-bottom: 2px solid #e2e8f0;
                            }
                            .print-table td {
                                padding: 10px 12px;
                                font-size: 13px;
                                border-bottom: 1px solid #e2e8f0;
                            }
                            .print-status {
                                padding: 2px 10px;
                                border-radius: 12px;
                                font-size: 11px;
                                font-weight: 500;
                                display: inline-block;
                            }
                            .print-status.active { background: #dcfce7; color: #166534; }
                            .print-status.settled { background: #dbeafe; color: #1e40af; }
                            .print-status.defaulted { background: #fee2e2; color: #991b1b; }
                            .print-status.overdue { background: #fef3c7; color: #92400e; }
                            .print-footer {
                                margin-top: 40px;
                                padding-top: 20px;
                                border-top: 1px solid #e2e8f0;
                                text-align: center;
                                font-size: 12px;
                                color: #94a3b8;
                            }
                            .risk-grade {
                                font-size: 32px;
                                font-weight: 700;
                            }
                            .risk-A { color: #22c55e; }
                            .risk-B { color: #3b82f6; }
                            .risk-C { color: #f59e0b; }
                            .risk-D { color: #ef4444; }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-container">
                        ${printContent.innerHTML}
                        <div class="print-footer">
                            Generated on ${new Date().toLocaleString()} | CrediSafe Credit Report
                        </div>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(function() {
                                window.close();
                            }, 500);
                        }
                    <\/script>
                </body>
            </html>
        `);
        printWindow.document.close();

        document.title = originalTitle;
    };

    // ✅ FIX: handleFlag is properly defined here
    const handleFlag = () => {
        alert('Flag / Lodge Dispute functionality will be implemented.');
    };

    const getRiskGrade = () => {
        const score = entity?.credit_score || creditHistory?.credit_score || 0;
        if (score >= 750) return { grade: 'A', color: 'text-green-600', label: 'Excellent' };
        if (score >= 650) return { grade: 'B', color: 'text-blue-600', label: 'Good' };
        if (score >= 500) return { grade: 'C', color: 'text-yellow-600', label: 'Fair' };
        return { grade: 'D', color: 'text-red-600', label: 'Poor' };
    };

    const getStatusBadge = () => {
        if (entity?.is_verified) {
            return (
                <span className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm">
                    <CheckCircleIcon className="w-4 h-4" />
                    Verified
                </span>
            );
        }
        return (
            <span className="flex items-center gap-1 text-gray-500 bg-gray-50 px-3 py-1 rounded-full text-sm">
                <ExclamationCircleIcon className="w-4 h-4" />
                Pending Verification
            </span>
        );
    };

    const calculateTotals = () => {
        const activeContracts = contracts.filter(c => c.status === 'active');
        const totalOutstanding = activeContracts.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
        const totalLoans = contracts.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
        const inArrears = activeContracts.filter(c => {
            if (!c.due_date) return false;
            return new Date(c.due_date) < new Date();
        });
        return {
            totalOutstanding,
            totalLoans,
            arrearsCount: inArrears.length,
            activeCount: activeContracts.length,
            historicalCount: contracts.filter(c => c.status === 'settled').length,
        };
    };

    const Sidebar = isAdmin ? AdminSidebar : ClientSidebar;
    const risk = getRiskGrade();
    const basePath = isAdmin ? '/admin' : '/client';
    const totals = calculateTotals();

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

    if (error || !entity) {
        return (
            <div className="flex h-screen bg-gray-50">
                <Sidebar />
                <div className="flex-1 ml-64 p-8">
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        {error || 'Entity not found'}
                    </div>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: 'Overview & Credit Summary', icon: DocumentTextIcon },
        { id: 'active', label: 'Active Credit History', icon: CreditCardIcon },
        { id: 'repayment', label: 'Repayment & Arrears Track', icon: CurrencyDollarIcon },
        { id: 'linked', label: 'Linked Entities / Guarantors', icon: UserGroupIcon },
    ];

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1 ml-64 overflow-y-auto p-8">
                {/* Header Actions */}
                <div className="flex justify-between items-start mb-6 no-print">
                    <div>
                        <h1 className="text-3xl font-bold text-primary">CREDISAFE</h1>
                        <p className="text-gray-500 mt-1">Credit Report</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handlePrint}
                            className="btn-secondary flex items-center gap-2 px-4 py-2"
                        >
                            <PrinterIcon className="w-5 h-5" />
                            Print Report
                        </button>
                        <button
                            onClick={handleFlag}
                            className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200"
                        >
                            <FlagIcon className="w-5 h-5" />
                            Flag / Lodge Dispute
                        </button>
                        <button
                            onClick={() => {
                                if (type === 'individual') {
                                    navigate(`${basePath}/enquiries/individuals`);
                                } else {
                                    navigate(`${basePath}/enquiries/companies`);
                                }
                            }}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <XCircleIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Printable Content */}
                <div ref={printRef}>
                    {/* Entity Profile Card */}
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <div className="flex flex-wrap items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {type === 'individual' ? entity.full_name : entity.name}
                                </h2>
                                <div className="flex flex-wrap gap-4 mt-2">
                                    <p className="text-sm text-gray-500">
                                        {type === 'individual' ? 'National ID:' : 'Registration No.:'}
                                        <span className="text-gray-700 font-medium ml-1">
                                            {type === 'individual' ? entity.national_id : entity.registration_number}
                                        </span>
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Phone:
                                        <span className="text-gray-700 font-medium ml-1">
                                            {type === 'individual' ? entity.phone_number : entity.phone}
                                        </span>
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Status: {getStatusBadge()}
                                    </p>
                                    {entity.address && (
                                        <p className="text-sm text-gray-500">
                                            Address:
                                            <span className="text-gray-700 font-medium ml-1">{entity.address}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Risk Grade</p>
                                <p className={`text-3xl font-bold ${risk.color}`}>
                                    {risk.grade} <span className="text-sm font-normal text-gray-500">({risk.label})</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats with Real Data */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-primary">
                            <p className="text-sm text-gray-500">Total Outstanding Balance</p>
                            <p className="text-2xl font-bold text-gray-800">
                                ${totals.totalOutstanding.toFixed(2)}
                            </p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                            <p className="text-sm text-gray-500">Active Arrears</p>
                            <p className="text-2xl font-bold text-red-600">{totals.arrearsCount}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                            <p className="text-sm text-gray-500">Total Loans Taken</p>
                            <p className="text-2xl font-bold text-gray-800">{contracts.length}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
                            <p className="text-sm text-gray-500">Credit Score</p>
                            <p className="text-2xl font-bold text-primary">
                                {creditHistory?.credit_score || entity?.credit_score || 'N/A'}
                            </p>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="border-b border-gray-200">
                            <nav className="flex overflow-x-auto">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`px-6 py-4 text-sm font-medium whitespace-nowrap flex items-center gap-2 transition-colors duration-200 ${activeTab === tab.id
                                            ? 'border-b-2 border-primary text-primary'
                                            : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                                            }`}
                                    >
                                        <tab.icon className="w-5 h-5" />
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <div className="p-6">
                            {/* Overview Tab with Real Data */}
                            {activeTab === 'overview' && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Credit Summary</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="text-sm text-gray-500">Total Loans Taken</p>
                                            <p className="text-xl font-bold text-gray-800">${totals.totalLoans.toFixed(2)}</p>
                                            <p className="text-xs text-gray-400 mt-1">{contracts.length} total agreements</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="text-sm text-gray-500">Total Balance Outstanding</p>
                                            <p className="text-xl font-bold text-gray-800">${totals.totalOutstanding.toFixed(2)}</p>
                                            <p className="text-xs text-gray-400 mt-1">{totals.activeCount} active agreements</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="text-sm text-gray-500">Active vs Historical</p>
                                            <p className="text-xl font-bold text-gray-800">
                                                {totals.activeCount} / {totals.historicalCount}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">Active / Settled</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="text-sm text-gray-500">Payment History</p>
                                            <p className={`text-xl font-bold ${totals.arrearsCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {totals.arrearsCount > 0 ? 'Has Arrears' : 'Good Standing'}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">{totals.arrearsCount} agreements in arrears</p>
                                        </div>
                                    </div>
                                    {creditHistory && (
                                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                            <h4 className="font-semibold text-gray-700">Credit History Details</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                                                <div>
                                                    <p className="text-xs text-gray-500">Total Borrowed</p>
                                                    <p className="font-medium">${parseFloat(creditHistory.total_borrowed || 0).toFixed(2)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Total Repaid</p>
                                                    <p className="font-medium">${parseFloat(creditHistory.total_repaid || 0).toFixed(2)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Total Claims</p>
                                                    <p className="font-medium">{creditHistory.total_claims || 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Default Risk</p>
                                                    <p className={`font-medium capitalize ${creditHistory.default_risk === 'low' ? 'text-green-600' :
                                                        creditHistory.default_risk === 'medium' ? 'text-yellow-600' :
                                                            'text-red-600'
                                                        }`}>
                                                        {creditHistory.default_risk || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Active Credit Tab with Real Data */}
                            {activeTab === 'active' && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Active Credit History</h3>
                                    {contracts.filter(c => c.status === 'active').length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50">
                                                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        <th className="px-4 py-3">Agreement No.</th>
                                                        <th className="px-4 py-3">Lender</th>
                                                        <th className="px-4 py-3">Amount</th>
                                                        <th className="px-4 py-3">Outstanding</th>
                                                        <th className="px-4 py-3">Start Date</th>
                                                        <th className="px-4 py-3">End Date</th>
                                                        <th className="px-4 py-3">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {contracts.filter(c => c.status === 'active').map((contract) => {
                                                        const isOverdue = new Date(contract.due_date) < new Date();
                                                        return (
                                                            <tr key={contract.id} className={isOverdue ? 'bg-red-50' : ''}>
                                                                <td className="px-4 py-3 font-mono text-sm">#{contract.id}</td>
                                                                <td className="px-4 py-3">{contract.lender_name || 'Unknown'}</td>
                                                                <td className="px-4 py-3 font-medium">
                                                                    {contract.currency?.toUpperCase()} {parseFloat(contract.amount).toFixed(2)}
                                                                </td>
                                                                <td className="px-4 py-3 font-medium text-primary">
                                                                    {contract.currency?.toUpperCase()} {parseFloat(contract.amount).toFixed(2)}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm">
                                                                    {contract.start_date ? new Date(contract.start_date).toLocaleDateString() : '-'}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm">
                                                                    {contract.due_date ? new Date(contract.due_date).toLocaleDateString() : '-'}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${isOverdue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                                                        }`}>
                                                                        {isOverdue ? 'Overdue' : 'Active'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">No active credit agreements found.</p>
                                    )}
                                </div>
                            )}

                            {/* Repayment Tab with Real Data */}
                            {activeTab === 'repayment' && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Repayment & Arrears Track Record</h3>
                                    {contracts.length > 0 ? (
                                        <div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                                <div className="bg-gray-50 rounded-lg p-4">
                                                    <p className="text-sm text-gray-500">Total Agreements</p>
                                                    <p className="text-xl font-bold text-gray-800">{contracts.length}</p>
                                                </div>
                                                <div className="bg-gray-50 rounded-lg p-4">
                                                    <p className="text-sm text-gray-500">Settled</p>
                                                    <p className="text-xl font-bold text-green-600">
                                                        {contracts.filter(c => c.status === 'settled').length}
                                                    </p>
                                                </div>
                                                <div className="bg-gray-50 rounded-lg p-4">
                                                    <p className="text-sm text-gray-500">In Arrears</p>
                                                    <p className="text-xl font-bold text-red-600">
                                                        {contracts.filter(c => c.status === 'active' && new Date(c.due_date) < new Date()).length}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full">
                                                    <thead className="bg-gray-50">
                                                        <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <th className="px-4 py-3">Agreement</th>
                                                            <th className="px-4 py-3">Amount</th>
                                                            <th className="px-4 py-3">Status</th>
                                                            <th className="px-4 py-3">Due Date</th>
                                                            <th className="px-4 py-3">Days Overdue</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200">
                                                        {contracts.map((contract) => {
                                                            const isOverdue = contract.status === 'active' && new Date(contract.due_date) < new Date();
                                                            const daysOverdue = isOverdue ? Math.floor((new Date() - new Date(contract.due_date)) / (1000 * 60 * 60 * 24)) : 0;
                                                            return (
                                                                <tr key={contract.id} className={isOverdue ? 'bg-red-50' : ''}>
                                                                    <td className="px-4 py-3 font-mono text-sm">#{contract.id}</td>
                                                                    <td className="px-4 py-3">
                                                                        {contract.currency?.toUpperCase()} {parseFloat(contract.amount).toFixed(2)}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${contract.status === 'settled' ? 'bg-green-100 text-green-800' :
                                                                            isOverdue ? 'bg-red-100 text-red-800' :
                                                                                'bg-blue-100 text-blue-800'
                                                                            }`}>
                                                                            {contract.status === 'settled' ? 'Settled' :
                                                                                isOverdue ? 'Overdue' :
                                                                                    contract.status?.toUpperCase() || 'Active'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm">
                                                                        {contract.due_date ? new Date(contract.due_date).toLocaleDateString() : '-'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm font-medium">
                                                                        {isOverdue ? `${daysOverdue} days` : '-'}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">No repayment history available.</p>
                                    )}
                                </div>
                            )}

                            {/* Linked Entities Tab */}
                            {activeTab === 'linked' && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Linked Entities / Guarantors</h3>
                                    {type === 'individual' ? (
                                        <div>
                                            {entity.company ? (
                                                <div className="bg-gray-50 rounded-lg p-4">
                                                    <p className="text-sm text-gray-500">Associated Company</p>
                                                    <p className="font-medium text-gray-800">{entity.company.name}</p>
                                                    <p className="text-sm text-gray-500">Reg: {entity.company.registration_number}</p>
                                                    <p className="text-sm text-gray-500">Phone: {entity.company.phone}</p>
                                                </div>
                                            ) : (
                                                <p className="text-gray-500">No linked companies found.</p>
                                            )}
                                            {contracts.filter(c => c.status === 'active').length > 0 && (
                                                <div className="mt-4">
                                                    <p className="text-sm font-medium text-gray-700">Active Lenders</p>
                                                    <div className="mt-2 space-y-2">
                                                        {[...new Set(contracts.filter(c => c.status === 'active').map(c => c.lender_name))].map((lender, idx) => (
                                                            <div key={idx} className="bg-gray-50 rounded-lg p-3">
                                                                <p className="font-medium">{lender}</p>
                                                                <p className="text-sm text-gray-500">
                                                                    {contracts.filter(c => c.lender_name === lender && c.status === 'active').length} active agreements
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-gray-500">Linked entities for companies will be shown here.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreditReport;