import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import apiClient from '../utils/apiClient';
import logo from '../assets/blawgy-logo.svg';

function InvitePage() {
    const [loading, setLoading] = useState(false);
    const [inviteStatus, setInviteStatus] = useState('pending');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const [token, setToken] = useState('');

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const inviteToken = queryParams.get('fq');
        if (!inviteToken) {
            setInviteStatus('invalid');
            return;
        }

        setToken(inviteToken);
    }, [location]);

    const handleAcceptInvite = async () => {
        try {
            setLoading(true);

            const response = await apiClient.post('/accept-invite', { token });

            if (response.data.success) {
                setInviteStatus('accepted');
                setTimeout(() => {
                    navigate('/dashboard', {
                        replace: true,
                        state: {
                            message: 'Invitation accepted! You now have access to the site.'
                        }
                    });
                }, 3000);
            } else {
                applyFailure(response.data.message);
            }
        } catch (error) {
            console.error('Error accepting invitation:', error);
            applyFailure(error.response?.data?.message);
        } finally {
            setLoading(false);
        }
    };

    // The backend only says "Invalid or expired invite link" for bad tokens;
    // everything else (network blips, server errors) is not an expiry and
    // should stay retryable.
    const applyFailure = (message) => {
        if (/invalid|expired/i.test(message || '')) {
            setInviteStatus('expired');
            setError(message);
        } else {
            setInviteStatus('error');
            setError(message || '');
        }
    };

    const renderContent = () => {
        switch (inviteStatus) {
            case 'pending':
                return (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="h-8 w-8 text-primary" />
                        </div>
                        <h2 className="text-2xl font-semibold mb-2">You're Invited!</h2>
                        <p className="text-gray-600 mb-6">
                            You've been invited to join a site. Click the button below to accept the invitation.
                        </p>

                        <div className="flex justify-center mt-8">
                            <button
                                onClick={handleAcceptInvite}
                                disabled={loading}
                                className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Processing...' : 'Accept Invitation'}
                            </button>
                        </div>
                    </div>
                );

            case 'expired':
                return (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="h-8 w-8 text-amber-600" />
                        </div>
                        <h2 className="text-2xl font-semibold mb-2">Invitation Expired</h2>
                        <p className="text-gray-600 mb-6">
                            {error || "This invitation link has expired. Please contact the site administrator for a new invitation."}
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
                        >
                            Go to Homepage
                        </button>
                    </div>
                );

            case 'invalid':
                return (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="h-8 w-8 text-amber-600" />
                        </div>
                        <h2 className="text-2xl font-semibold mb-2">Invitation Link Incomplete</h2>
                        <p className="text-gray-600 mb-6">
                            This link is missing its invitation code. Open the link from your email again, or ask the person who invited you for a new one.
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
                        >
                            Go to Homepage
                        </button>
                    </div>
                );

            case 'error':
                return (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="h-8 w-8 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-semibold mb-2">Something went wrong</h2>
                        <p className="text-gray-600 mb-6">
                            {error || "We couldn't accept this invitation. Please try again."}
                        </p>
                        <button
                            onClick={() => {
                                setError('');
                                setInviteStatus('pending');
                            }}
                            className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
                        >
                            Try again
                        </button>
                    </div>
                );

            case 'accepted':
                return (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-semibold mb-2">Invitation Accepted!</h2>
                        <p className="text-gray-600 mb-6">
                            You have successfully accepted the invitation. Redirecting you to login...
                        </p>
                        <div className="animate-pulse">
                            <div className="h-2 w-24 bg-gray-200 rounded mx-auto"></div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
                <img
                    src={logo}
                    alt="Blawgy Logo"
                    className="h-12 mx-auto mb-8 bg-primary rounded-full px-3 py-2"
                />
                {renderContent()}
            </div>
        </div>
    );
};

export default InvitePage;