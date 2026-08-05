import { useState, useEffect } from 'react';
import { LinkIcon, XIcon, ChevronLeftIcon, Loader2Icon } from 'lucide-react';
import { validateAndCleanDomain, cleanDomain } from '../utils/domainUtils';
import apiClient from '../utils/apiClient';
import { BaseModal } from './Modals';

const ConnectSiteModal = ({ isOpen, onClose, user }) => {
    const [step, setStep] = useState(1);
    const [domain, setDomain] = useState('');
    const [description, setDescription] = useState('');
    const [faviconUrl, setFaviconUrl] = useState('');
    const [isSaved, setIsSaved] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [elapsed, setElapsed] = useState(0);

    // Live seconds counter while the site is being read (step 1 spinner).
    useEffect(() => {
        if (!isLoading) return undefined;
        setElapsed(0);
        const startedAt = Date.now();
        const id = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startedAt) / 1000));
        }, 1000);
        return () => clearInterval(id);
    }, [isLoading]);

    const validateDomain = (domain) => {
        const result = validateAndCleanDomain(domain);
        return result.isValid;
    };

    const handleFetchDescription = async () => {
        setError('');

        if (!domain) {
            setError('Please enter a domain name');
            return;
        }

        if (!validateDomain(domain)) {
            setError('Please enter a valid domain name (e.g., example.com)');
            return;
        }

        setIsLoading(true);
        try {
            let fullUrl = domain;
            if (!fullUrl.match(/^https?:\/\//)) {
                fullUrl = `https://${fullUrl}`;
            }

            const response = await apiClient.get('scrape-site', {
                params: { website: fullUrl }
            });

            const fetchedDescription = response.data.productDescription || '';
            setDescription(fetchedDescription);
            if (response.data.faviconUrl) setFaviconUrl(response.data.faviconUrl);
            setStep(2);
        } catch (error) {
            console.error('Error fetching site description:', error);
            const data = error?.response?.data;
            // The site is owned by another account. Don't advance to manual
            // entry: they can't connect a claimed domain here.
            if (data?.alreadyClaimed) {
                setError(
                    "This site is already claimed. If it's yours, you might have signed up with a different email. " +
                    "If not, message us in the support chat (bottom right) and we'll get it sorted."
                );
                return;
            }
            // A social/platform domain we don't onboard. Keep them on step 1.
            if (data?.blockedDomain) {
                setError(data.message || 'Please enter your own business website instead.');
                return;
            }
            setError('Could not fetch site description. You can enter it manually.');
            setStep(2);
            setDescription('');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setError('');
        setIsLoading(true);

        try {
            const response = await apiClient.post('/connect-site', {
                domain: cleanDomain(domain),
                email: user.email,
                settings: {
                    businessDescription: description,
                    ...(faviconUrl && { faviconUrl })
                }
            });

            if (response.data.success && !response?.data?.error) {
                // The site list lives in App-level state with no exposed
                // refresh, so a reload is still how the new site shows up.
                // The success banner below renders first so the user sees
                // confirmation before the page refreshes.
                setIsSaved(true);
                setTimeout(() => window.location.reload(), 1500);
            } else {
                const reason = response?.data?.error || response?.data?.message;
                setError(
                    typeof reason === 'string' && reason.trim()
                        ? `Couldn't connect your site: ${reason}`
                        : "Couldn't connect your site. Please try again."
                );
            }
        } catch (error) {
            console.error('Error connecting site:', error);
            setError("Couldn't connect your site. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        setStep(1);
        setError('');
    };

    const handleClose = () => {
        setStep(1);
        setDomain('');
        setDescription('');
        setError('');
        setIsSaved(false);
        onClose();
    };

    return (
        <BaseModal isOpen={isOpen} onClose={handleClose} className="max-w-lg">
            <div>
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <div className="flex items-center">
                        {step === 2 && !isSaved && (
                            <button onClick={handleBack} className="mr-3 text-gray-500 hover:text-gray-700">
                                <ChevronLeftIcon className="h-5 w-5" />
                            </button>
                        )}
                        <h2 className="text-xl font-semibold text-gray-900">
                            {step === 1 ? 'Connect Your Site' : 'Describe Your Business'}
                        </h2>
                    </div>
                    <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6">
                    {step === 1 ? (
                        <>
                            <div className="mb-4">
                                <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
                                    Enter your domain name
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <LinkIcon className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        name="domain"
                                        id="domain"
                                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md"
                                        placeholder="www.example.com"
                                        value={domain}
                                        onChange={(e) => {
                                            setDomain(e.target.value);
                                            setError('');
                                        }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleFetchDescription()}
                                    />
                                </div>
                            </div>
                            <div className="mt-6">
                                <button
                                    onClick={handleFetchDescription}
                                    className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2Icon className="animate-spin h-4 w-4 mr-2" />
                                            Reading your site...
                                            <span className="ml-2 tabular-nums opacity-70" data-testid="connect-site-elapsed">{elapsed}s</span>
                                        </>
                                    ) : (
                                        'Continue'
                                    )}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="mb-2">
                                <div className="flex items-center justify-between mb-2">
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                        Business description
                                    </label>
                                    <span className="text-xs text-gray-400">{domain}</span>
                                </div>
                                <p className="text-sm text-gray-500 mb-3">
                                    This helps us generate relevant blog content for your site. Edit as needed.
                                </p>
                                <textarea
                                    id="description"
                                    rows={6}
                                    className="block w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent resize-none"
                                    placeholder="Describe your business, products, or services..."
                                    value={description}
                                    onChange={(e) => {
                                        setDescription(e.target.value);
                                        setError('');
                                    }}
                                />
                            </div>
                            <div className="mt-6">
                                <button
                                    onClick={handleSave}
                                    className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                    disabled={isLoading || isSaved}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2Icon className="animate-spin h-4 w-4 mr-2" />
                                            Saving...
                                        </>
                                    ) : isSaved ? (
                                        'Saved!'
                                    ) : (
                                        'Save & Continue'
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {isSaved && (
                    <div className="px-6 py-4 bg-green-50 border-t border-green-200">
                        <p className="text-sm text-green-600">
                            Your site has been connected! Redirecting...
                        </p>
                    </div>
                )}
                {error && (
                    <div className="px-6 py-4 bg-red-50 border-t border-red-200">
                        <p className="text-sm text-red-600">
                            {error}
                        </p>
                    </div>
                )}
            </div>
        </BaseModal>
    );
};

export default ConnectSiteModal;
