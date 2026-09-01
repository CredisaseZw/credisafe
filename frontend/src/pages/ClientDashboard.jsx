import React from 'react';
import { useNavigate } from 'react-router-dom';
import ClientSidebar from '../components/ClientSidebar';

const ClientDashboard = () => {
    const navigate = useNavigate();

    const options = [
        {
            title: 'Individuals',
            description: 'Check payment status for individual enquiries.',
            path: '/client/enquiries/individuals',
        },
        {
            title: 'Companies',
            description: 'Check payment status for company enquiries.',
            path: '/client/enquiries/companies',
        },
        {
            title: 'AssetSafe',
            path: '/client/active-credit',
        },
    ];

    return (
        <div className="flex h-screen bg-gray-50">
            <ClientSidebar />

            <div className="flex-1 ml-64 overflow-y-auto p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-primary">CREDISAFE</h1>
                    <p className="text-gray-500 mt-1">Dashboard</p>
                </div>

                <div className="max-w-4xl">
                    {/* Header */}
                    <div className="bg-primary rounded-t-xl px-6 py-4 shadow-sm">
                        <h2 className="text-xl font-semibold text-white">
                            Payment Status Check
                        </h2>
                    </div>

                    {/* Options */}
                    <div className="bg-white rounded-b-xl shadow-md p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {options.map((option) => (
                                <button
                                    key={option.title}
                                    onClick={() => navigate(option.path)}
                                    className="group text-left bg-white border border-gray-200 rounded-lg p-5
                             shadow-sm hover:shadow-md hover:border-primary
                             transition-all duration-200"
                                >
                                    <h3 className="text-lg font-semibold text-primary group-hover:underline">
                                        {option.title}
                                    </h3>

                                    {option.description && (
                                        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                            {option.description}
                                        </p>
                                    )}

                                    {option.title !== 'AssetSafe' && (
                                        <div className="mt-4 text-sm font-medium text-primary">
                                            Check status →
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientDashboard;