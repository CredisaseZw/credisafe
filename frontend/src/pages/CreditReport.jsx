import React, { useState, useEffect } from 'react';
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

    const [entity, setEntity] = useState(null);
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
            let response;
            if (type === 'individual') {
                response = await api.get(`/persons/${id}/`);
                setEntity(response.data);
            } else {
                response = await api.get(`/companies/${id}/`);
                setEntity(response.data);
            }
        } catch (error) {
            console.error('Error fetching entity:', error);
            setError('Failed to load credit report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleFlag = () => {
        alert('Flag / Lodge Dispute functionality will be implemented.');
    };

    const getRiskGrade = () => {
        const score = entity?.credit_score || 0;
        if (score >= 750) return { grade: 'A', color: 'text-green-600' };
        if (score >= 650) return { grade: 'B', color: 'text-blue-600' };
        if (score >= 500) return { grade: 'C', color: 'text-yellow-600' };
        return { grade: 'D', color: 'text-red-600' };
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

    const Sidebar = isAdmin ? AdminSidebar : ClientSidebar;
    const risk = getRiskGrade();
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
                <div className="flex justify-between items-start mb-6">
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
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Risk Grade</p>
                            <p className={`text-3xl font-bold ${risk.color}`}>{risk.grade}</p>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-500">Total Outstanding Balance</p>
                        <p className="text-2xl font-bold text-gray-800">$0.00</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-500">Active Arrears</p>
                        <p className="text-2xl font-bold text-green-600">0</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-500">Total Loans Taken</p>
                        <p className="text-2xl font-bold text-gray-800">0</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-500">Credit Score</p>
                        <p className="text-2xl font-bold text-primary">{entity.credit_score || 'N/A'}</p>
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
                        {activeTab === 'overview' && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Credit Summary</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm text-gray-500">Total Loans Taken</p>
                                        <p className="text-xl font-bold text-gray-800">$0.00</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm text-gray-500">Total Balance Outstanding</p>
                                        <p className="text-xl font-bold text-gray-800">$0.00</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm text-gray-500">Active vs Historical</p>
                                        <p className="text-xl font-bold text-gray-800">0 / 0</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm text-gray-500">Payment History</p>
                                        <p className="text-xl font-bold text-green-600">Good</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'active' && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Active Credit History</h3>
                                <p className="text-gray-500">No active credit agreements found.</p>
                            </div>
                        )}

                        {activeTab === 'repayment' && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Repayment & Arrears Track Record</h3>
                                <p className="text-gray-500">No repayment history available.</p>
                            </div>
                        )}

                        {activeTab === 'linked' && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Linked Entities / Guarantors</h3>
                                <p className="text-gray-500">No linked entities found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreditReport;