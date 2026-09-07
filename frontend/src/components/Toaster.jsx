import React, { useState, useEffect } from 'react';
import { XCircleIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/react/outline';

const Toaster = ({ message, type = 'info', duration = 5000, onClose }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            if (onClose) setTimeout(onClose, 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (!isVisible) return null;

    const styles = {
        success: {
            bg: 'bg-green-50',
            border: 'border-green-400',
            text: 'text-green-800',
            icon: CheckCircleIcon,
            iconColor: 'text-green-400',
        },
        error: {
            bg: 'bg-red-50',
            border: 'border-red-400',
            text: 'text-red-800',
            icon: XCircleIcon,
            iconColor: 'text-red-400',
        },
        warning: {
            bg: 'bg-yellow-50',
            border: 'border-yellow-400',
            text: 'text-yellow-800',
            icon: ExclamationCircleIcon,
            iconColor: 'text-yellow-400',
        },
        info: {
            bg: 'bg-blue-50',
            border: 'border-blue-400',
            text: 'text-blue-800',
            icon: InformationCircleIcon,
            iconColor: 'text-blue-400',
        },
    };

    const style = styles[type] || styles.info;
    const Icon = style.icon;

    return (
        <div className={`fixed top-4 right-4 z-50 max-w-md w-full ${style.bg} border-l-4 ${style.border} rounded-lg shadow-lg p-4 animate-slide-in`}>
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    <Icon className={`h-5 w-5 ${style.iconColor}`} />
                </div>
                <div className="ml-3 flex-1">
                    <p className={`text-sm font-medium ${style.text}`}>{message}</p>
                </div>
                <button
                    onClick={() => {
                        setIsVisible(false);
                        if (onClose) setTimeout(onClose, 300);
                    }}
                    className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                    <XCircleIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

// Toast Context for global usage
export const ToastContext = React.createContext();

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = (message, type = 'info', duration = 5000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, duration }]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-4 right-4 z-50 space-y-2">
                {toasts.map(toast => (
                    <Toaster
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = React.useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export default Toaster;