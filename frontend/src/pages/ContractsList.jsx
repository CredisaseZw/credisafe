import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { EyeIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/outline';

const ContractsList = () => {
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchContracts();
    }, []);

    const fetchContracts = async () => {
        try {
            const response = await api.get('/contracts/');
            setContracts(response.data.results || response.data || []);
        } catch (error) {
            console.error('Error fetching contracts:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-6">All Credit Agreements</h1>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <th className="px-6 py-3">Agreement</th>
                                <th className="px-6 py-3">Lender</th>
                                <th className="px-6 py-3">Borrower</th>
                                <th className="px-6 py-3">Amount</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {contracts.map((contract) => (
                                <tr key={contract.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono text-sm">#{contract.id}</td>
                                    <td className="px-6 py-4">{contract.lender_name || 'Unknown'}</td>
                                    <td className="px-6 py-4">{contract.borrower_name || 'Unknown'}</td>
                                    <td className="px-6 py-4 font-medium">
                                        {contract.currency?.toUpperCase()} {contract.amount}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${contract.status === 'active' ? 'bg-green-100 text-green-800' :
                                            contract.status === 'settled' ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                            {contract.status?.charAt(0).toUpperCase() + contract.status?.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(contract.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button className="text-blue-600 hover:text-blue-800">
                                                <EyeIcon className="w-5 h-5" />
                                            </button>
                                            {contract.status === 'active' && (
                                                <button className="text-green-600 hover:text-green-800">
                                                    <CheckCircleIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ContractsList;