import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(username, password);

        if (result.success) {
            const user = result.user;
            if (user?.is_superuser) {
                navigate('/admin');
            } else if (user?.is_client_user) {
                navigate('/client');
            } else {
                navigate('/client');
            }
        } else {
            setError(result.error || 'Invalid credentials');
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-primary-dark p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-primary">CrediSafe</h1>
                    <p className="text-gray-500 mt-1">Credit Management System</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="label-text">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="input-field"
                            placeholder="Enter your username"
                            required
                        />
                    </div>

                    <div className="mb-6">
                        <label className="label-text">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-field"
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary py-3 text-lg font-semibold"
                    >
                        {loading ? 'Logging in...' : 'Sign In'}
                    </button>
                </form>

                {/* <div className="mt-6 text-center text-sm text-gray-500">
                    <p>Demo credentials:</p>
                    <p className="font-mono text-xs">admin / admin123</p>
                    <p className="font-mono text-xs">client / client123</p>
                </div> */}
            </div>
        </div>
    );
};

export default Login;