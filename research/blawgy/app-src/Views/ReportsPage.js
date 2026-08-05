import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Check, LoaderIcon, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useImpersonation } from '../contexts/ImpersonationContext';
import NavbarWrapper from '../components/Navbar';
import { useModals } from '../contexts/ModalContext';
import apiClient from '../utils/apiClient';

// site.keywords rows mix raw strings with { keyword, volume, difficulty, source }
// objects (see SettingsPage normalizeKeywordList / backend utils/normalizeKeywords).
// Reduce each row to its trimmed, lowercased text for membership checks.
const keywordKey = (item) => {
    let str = '';
    if (typeof item === 'string') str = item;
    else if (item && typeof item === 'object') {
        const candidate = item.keyword ?? item.kw ?? item.term ?? item.text ?? item.name;
        if (typeof candidate === 'string') str = candidate;
    } else if (typeof item === 'number' || typeof item === 'boolean') {
        str = String(item);
    }
    return str.trim().toLowerCase();
};

// Skeleton loader for chart
const ChartSkeleton = () => (
    <div className="bg-white rounded-lg shadow p-6 mb-6 animate-pulse">
        <div className="flex justify-between items-center mb-4">
            <div className="h-6 bg-gray-200 rounded w-40"></div>
            <div className="flex gap-4">
                <div className="h-8 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-28"></div>
            </div>
        </div>
        <ChartBodySkeleton />
    </div>
);

// Deterministic bar heights: Math.random() in render made the skeleton
// jitter on every re-render while loading.
const SKELETON_BAR_HEIGHTS = [...Array(28)].map((_, i) => 20 + ((i * 37) % 60));

// Just the plot area, for refetches where the card + legend stay mounted.
const ChartBodySkeleton = () => (
    <div className="h-[400px] flex items-end justify-between gap-1 px-8 pt-8 animate-pulse">
        {SKELETON_BAR_HEIGHTS.map((h, i) => (
            <div
                key={i}
                className="bg-gray-200 rounded-t w-full"
                style={{ height: `${h}%` }}
            ></div>
        ))}
    </div>
);

// Just the body rows, for refetches where the table header controls stay mounted.
const TableBodySkeleton = ({ rows = 10, cols = 3 }) => (
    <tbody className="animate-pulse">
        {[...Array(rows)].map((_, i) => (
            <tr key={i} className="border-b">
                <td className="py-3"><div className="h-4 bg-gray-200 rounded w-3/4"></div></td>
                {[...Array(cols - 1)].map((_, j) => (
                    <td key={j} className="py-3"><div className="h-4 bg-gray-200 rounded w-10 mx-auto"></div></td>
                ))}
            </tr>
        ))}
    </tbody>
);

// Skeleton loader for tables
const TableSkeleton = ({ title }) => (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="flex justify-between items-center mb-4">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
            <div className="h-10 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b">
                        <th className="text-left p-2"><div className="h-4 bg-gray-200 rounded w-16"></div></th>
                        <th className="text-right p-2"><div className="h-4 bg-gray-200 rounded w-12 ml-auto"></div></th>
                        <th className="text-right p-2"><div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div></th>
                    </tr>
                </thead>
                <tbody>
                    {[...Array(10)].map((_, i) => (
                        <tr key={i} className="border-b">
                            <td className="py-3"><div className="h-4 bg-gray-200 rounded w-3/4"></div></td>
                            <td className="py-3"><div className="h-4 bg-gray-200 rounded w-8 ml-auto"></div></td>
                            <td className="py-3"><div className="h-4 bg-gray-200 rounded w-12 ml-auto"></div></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const ReportsPage = ({ logout, currentSite, updateCurrentSite }) => {
    const data = useImpersonation();
    const { user, siteSettings } = data;

    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState({
        startDate: dayjs().subtract(28, 'day').format('YYYY-MM-DD'),
        endDate: dayjs().format('YYYY-MM-DD'),
        custom: false
    });
    const [selectedRange, setSelectedRange] = useState('last28d');
    const [gscData, setGscData] = useState({
        trafficData: [],
        topPosts: [],
        topQueries: []
    });
    const [postsLimit, setPostsLimit] = useState(10);
    const [queriesLimit, setQueriesLimit] = useState(10);
    const [visibleMetrics, setVisibleMetrics] = useState({
        clicks: true,
        impressions: true
    });
    const [showDomainSelection, setShowDomainSelection] = useState(false);
    const [availableGscSites, setAvailableGscSites] = useState([]);
    const [selectionToken, setSelectionToken] = useState(null);
    const [disconnecting, setDisconnecting] = useState(false);
    const [showReconnectModal, setShowReconnectModal] = useState(false);
    const [reconnectError, setReconnectError] = useState(null);
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
    const [fetchErrors, setFetchErrors] = useState({ traffic: false, posts: false, queries: false });
    // Queries saved to the site's keyword list during this session (lowercase),
    // layered on top of siteSettings.keywords, which the context only refreshes
    // on site switch / reload.
    const [addedKeywords, setAddedKeywords] = useState(() => new Set());
    const [addingQueries, setAddingQueries] = useState(() => new Set());
    const [addingAll, setAddingAll] = useState(false);
    // Live site for in-flight keyword saves: after a site switch, a late
    // failure must not revert state or toast about the previous site.
    const activeSiteRef = useRef(null);

    const {
        setShowSupportModal,
        setShowImageStyleModal,
        setShowAdminPanel,
        setShowBulkGenerateModal,
        setShowSubscriptionModal,
    } = useModals();

    // Request-sequencing guards. Changing the date range or a rows-limit
    // refires these fetches (sometimes twice — once directly, once via the
    // isConnected/fetchGSCData effect) with no abort, so a slow earlier
    // response can land last and overwrite the newer range/limit. Each
    // fetcher bumps its own id and only applies the result if still latest.
    const trafficRequestIdRef = useRef(0);
    const postsRequestIdRef = useRef(0);
    const queriesRequestIdRef = useRef(0);

    // GSC connection + data are keyed off siteSettings (the access token lives
    // there), which only updates ~10s after a site switch. Until then this
    // page would keep rendering the previous site's charts as if they were the
    // new site's. Reset to skeletons the instant the *selected* site changes
    // so the new site's data loads in cleanly instead of swapping under stale
    // numbers. Keyed on the domain string so date-range/limit changes (same
    // site) don't wipe the charts.
    const selectedSiteName = typeof currentSite === 'string' ? currentSite : currentSite?.site;
    activeSiteRef.current = selectedSiteName;
    useEffect(() => {
        setLoading(true);
        setGscData({ trafficData: [], topPosts: [], topQueries: [] });
        setAddedKeywords(new Set());
        setAddingQueries(new Set());
    }, [selectedSiteName]);

    // Keywords already saved on the site (lowercase), so added queries render
    // as a check instead of a plus.
    const existingKeywords = useMemo(() => {
        const set = new Set();
        (Array.isArray(siteSettings?.keywords) ? siteSettings.keywords : []).forEach((item) => {
            const key = keywordKey(item);
            if (key) set.add(key);
        });
        return set;
    }, [siteSettings?.keywords]);

    const isQueryAdded = useCallback((query) => {
        const key = typeof query === 'string' ? query.trim().toLowerCase() : '';
        return !!key && (existingKeywords.has(key) || addedKeywords.has(key));
    }, [existingKeywords, addedKeywords]);

    // Visible queries not yet in the keyword list (deduped, original casing).
    const pendingQueries = useMemo(() => {
        const seen = new Set();
        const out = [];
        gscData.topQueries.forEach((row) => {
            const kw = typeof row?.keys?.[0] === 'string' ? row.keys[0].trim() : '';
            if (!kw) return;
            const key = kw.toLowerCase();
            if (seen.has(key) || isQueryAdded(kw)) return;
            seen.add(key);
            out.push(kw);
        });
        return out;
    }, [gscData.topQueries, isQueryAdded]);

    // Both adds are optimistic: the check appears the moment the user clicks
    // and only reverts (with an error toast) if the save fails. The save
    // itself is a sub-second POST, so waiting on it with spinners made the
    // whole table feel slow.
    const addQueryToKeywords = async (query) => {
        const kw = typeof query === 'string' ? query.trim() : '';
        const key = kw.toLowerCase();
        if (!kw || addingQueries.has(key) || isQueryAdded(kw)) return;
        const siteAtCall = activeSiteRef.current;
        setAddingQueries(prev => new Set(prev).add(key));
        setAddedKeywords(prev => new Set(prev).add(key));
        toast.success(`Added "${kw}" to your keywords.`);
        try {
            const response = await apiClient.post('/api/save-keywords', {
                site: siteSettings?.site,
                keywords: [{ kw, source: 'gsc' }]
            });
            if (!response.data?.success) {
                throw new Error(response.data?.message || 'Failed to save keyword');
            }
        } catch (err) {
            console.error('Error adding query to keywords:', err);
            // Site switched while in flight: state was already reset, and a
            // toast about the previous site's keyword would only confuse.
            if (activeSiteRef.current !== siteAtCall) return;
            setAddedKeywords(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
            toast.error(`"${kw}" didn't save. Please try again.`);
        } finally {
            setAddingQueries(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        }
    };

    const addAllQueriesToKeywords = async () => {
        if (addingAll) return;
        const pending = pendingQueries;
        if (pending.length === 0) {
            toast.success('All queries are already in your keywords.');
            return;
        }
        setAddingAll(true);
        const siteAtCall = activeSiteRef.current;
        const pendingKeys = pending.map((kw) => kw.toLowerCase());
        setAddedKeywords(prev => {
            const next = new Set(prev);
            pendingKeys.forEach((key) => next.add(key));
            return next;
        });
        toast.success(pending.length === 1 ? 'Added 1 keyword.' : `Added ${pending.length} keywords.`);
        try {
            const response = await apiClient.post('/api/save-keywords', {
                site: siteSettings?.site,
                keywords: pending.map((kw) => ({ kw, source: 'gsc' }))
            });
            if (!response.data?.success) {
                throw new Error(response.data?.message || 'Failed to save keywords');
            }
        } catch (err) {
            console.error('Error adding queries to keywords:', err);
            if (activeSiteRef.current !== siteAtCall) return;
            setAddedKeywords(prev => {
                const next = new Set(prev);
                pendingKeys.forEach((key) => next.delete(key));
                return next;
            });
            toast.error("Those queries didn't save. Please try again.");
        } finally {
            setAddingAll(false);
        }
    };

    // Define fetchGSCData before other functions that depend on it
    const fetchTrafficData = useCallback(async (currentDateRange = dateRange) => {
        const requestId = ++trafficRequestIdRef.current;
        try {
            const response = await apiClient.get('/gsc/data', {
                timeout: 45000,
                params: {
                    site: siteSettings?.site,
                    filters: {
                        startDate: currentDateRange.startDate,
                        endDate: currentDateRange.endDate,
                        dimensions: ['date'],
                    }
                }
            });
            if (requestId !== trafficRequestIdRef.current) return;
            setGscData(prev => ({
                ...prev,
                trafficData: response.data.rows || []
            }));
            setFetchErrors(prev => ({ ...prev, traffic: false }));
        } catch (err) {
            if (requestId !== trafficRequestIdRef.current) return;
            console.error('GSC traffic data error:', err);
            if (err.response?.status === 401 && err.response?.data?.needsReconnect) {
                setReconnectError(err.response.data.message || 'GSC connection expired');
                setShowReconnectModal(true);
            } else if (err.response?.status === 401) {
                // Token invalid or revoked - show connect screen
                setIsConnected(false);
            } else {
                setFetchErrors(prev => ({ ...prev, traffic: true }));
            }
        }
    }, [dateRange, siteSettings?.site]);

    const fetchTopPosts = useCallback(async (limit = postsLimit, currentDateRange = dateRange) => {
        const requestId = ++postsRequestIdRef.current;
        try {
            setLoading(true);
            const response = await apiClient.get('/gsc/data', {
                timeout: 45000,
                params: {
                    site: siteSettings?.site,
                    filters: {
                        startDate: currentDateRange.startDate,
                        endDate: currentDateRange.endDate,
                        dimensions: ['page'],
                        limit
                    }
                }
            });
            if (requestId !== postsRequestIdRef.current) return;
            setGscData(prev => ({
                ...prev,
                topPosts: response.data.rows || []
            }));
            setFetchErrors(prev => ({ ...prev, posts: false }));
        } catch (err) {
            if (requestId !== postsRequestIdRef.current) return;
            console.error('GSC top posts error:', err);
            if (err.response?.status === 401 && err.response?.data?.needsReconnect) {
                setReconnectError(err.response.data.message || 'GSC connection expired');
                setShowReconnectModal(true);
            } else if (err.response?.status === 401) {
                // Token invalid or revoked - show connect screen
                setIsConnected(false);
            } else {
                setFetchErrors(prev => ({ ...prev, posts: true }));
            }
        } finally {
            if (requestId === postsRequestIdRef.current) {
                setLoading(false);
            }
        }
    }, [postsLimit, dateRange, siteSettings?.site]);

    const fetchTopQueries = useCallback(async (limit = queriesLimit, currentDateRange = dateRange) => {
        const requestId = ++queriesRequestIdRef.current;
        try {
            setLoading(true);
            const response = await apiClient.get('/gsc/data', {
                timeout: 45000,
                params: {
                    site: siteSettings?.site,
                    filters: {
                        startDate: currentDateRange.startDate,
                        endDate: currentDateRange.endDate,
                        dimensions: ['query'],
                        limit
                    }
                }
            });
            if (requestId !== queriesRequestIdRef.current) return;
            setGscData(prev => ({
                ...prev,
                topQueries: response.data.rows || []
            }));
            setFetchErrors(prev => ({ ...prev, queries: false }));
        } catch (err) {
            if (requestId !== queriesRequestIdRef.current) return;
            console.error('GSC top queries error:', err);
            if (err.response?.status === 401 && err.response?.data?.needsReconnect) {
                setReconnectError(err.response.data.message || 'GSC connection expired');
                setShowReconnectModal(true);
            } else if (err.response?.status === 401) {
                // Token invalid or revoked - show connect screen
                setIsConnected(false);
            } else {
                setFetchErrors(prev => ({ ...prev, queries: true }));
            }
        } finally {
            if (requestId === queriesRequestIdRef.current) {
                setLoading(false);
            }
        }
    }, [queriesLimit, dateRange, siteSettings?.site]);

    const fetchGSCData = useCallback(async (newDateRange) => {
        try {
            const currentDateRange = newDateRange || dateRange;
            setLoading(true);
            await Promise.all([
                fetchTrafficData(currentDateRange),
                fetchTopPosts(postsLimit, currentDateRange),
                fetchTopQueries(queriesLimit, currentDateRange)
            ]);
        } catch (err) {
            // Individual fetch functions handle their own errors
            console.error('Error fetching GSC data:', err);
        } finally {
            setLoading(false);
        }
    }, [dateRange, fetchTrafficData, fetchTopPosts, fetchTopQueries, postsLimit, queriesLimit]);

    const checkGSCConnection = useCallback(async () => {
        try {
            setIsConnected(!!siteSettings?.gsc?.access_token);
        } catch (err) {
            console.error('Failed to check GSC connection:', err);
            setIsConnected(false);
        } finally {
            setLoading(false);
        }
    }, [siteSettings?.gsc?.access_token]);

    const refreshSiteSettings = useCallback(async () => {
        try {
            setLoading(true);
            // Force refresh site settings from server
            const response = await apiClient.get('/site-settings', {
                params: { site: siteSettings?.site }
            });

            if (response.data.success) {
                // Update the site settings in the parent component or context
                // This assumes there's a way to update site settings
                setIsConnected(!!response.data.settings?.gsc?.access_token);

                if (response.data.settings?.gsc?.access_token) {
                    fetchGSCData();
                }
            }
        } catch (err) {
            console.error('Failed to refresh site settings:', err);
            // Don't crash the page - just show disconnected state
            setIsConnected(false);
        } finally {
            setLoading(false);
        }
    }, [siteSettings?.site, fetchGSCData]);

    useEffect(() => {
        checkGSCConnection();
    }, [checkGSCConnection]);

    useEffect(() => {
        if (isConnected) {
            fetchGSCData();
        }
    }, [isConnected, fetchGSCData]);

    // Handle OAuth redirect success
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const connected = urlParams.get('connected');
        const error = urlParams.get('error');
        const selectDomain = urlParams.get('select_domain');
        const token = urlParams.get('token');
        
        if (selectDomain === 'true' && token) {
            // Show domain selection UI
            setSelectionToken(token);
            fetchAvailableGscSites(token);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (connected === 'true') {
            // Clean up URL and force check connection status
            window.history.replaceState({}, document.title, window.location.pathname);
            // Give backend a moment to update, then refresh settings
            setTimeout(() => {
                refreshSiteSettings();
            }, 1000);
        }
        
        if (error) {
            // Raw values here come from Google's OAuth redirect or our backend
            // callback; map them to plain copy instead of showing them verbatim.
            const rawError = decodeURIComponent(error);
            let friendly;
            if (/access_denied|denied/i.test(rawError)) {
                friendly = 'You canceled the Google connection. Nothing was changed. You can connect again whenever you like.';
            } else if (/no authorization code/i.test(rawError)) {
                friendly = "Google didn't finish the connection. Please try connecting again.";
            } else {
                friendly = "We couldn't connect Google Search Console. Please try again.";
            }
            setError(friendly);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [refreshSiteSettings]);

    const fetchAvailableGscSites = async (token) => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/gsc/sites/${token}`);
            if (response.data.success) {
                setAvailableGscSites(response.data.sites);
                setShowDomainSelection(true);
            }
        } catch (err) {
            console.error('Failed to fetch GSC sites:', err);
            setError("Couldn't load your Search Console sites. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const selectGscDomain = async (selectedSite) => {
        try {
            setLoading(true);
            const response = await apiClient.post('/gsc/connect', {
                token: selectionToken,
                selectedGscSite: selectedSite.url,
                currentBlawgySite: siteSettings?.site
            });
            
            if (response.data.success) {
                setShowDomainSelection(false);
                setAvailableGscSites([]);
                setSelectionToken(null);
                // Reload the page to refresh all state and fetch GSC data
                window.location.reload();
            }
        } catch (err) {
            console.error('Failed to connect GSC domain:', err);
            setError("Couldn't connect that domain. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const disconnectGSC = async () => {
        try {
            setDisconnecting(true);
            const response = await apiClient.post('/gsc/disconnect', {
                site: siteSettings?.site
            });

            if (response.data.success) {
                // Refresh the page to update the connection status
                window.location.reload();
            } else {
                toast.error("Couldn't disconnect Google Search Console. Please try again.");
            }
        } catch (err) {
            console.error('Failed to disconnect GSC:', err);
            toast.error("Couldn't disconnect Google Search Console. Please try again.");
        } finally {
            setDisconnecting(false);
        }
    };

    const handleReconnectDismiss = () => {
        setShowReconnectModal(false);
        setReconnectError(null);
        setIsConnected(false);
    };

    const handleReconnectConnect = () => {
        setShowReconnectModal(false);
        setReconnectError(null);
        handleConnect();
    };

    const handleReconnectDisconnect = async () => {
        setShowReconnectModal(false);
        setReconnectError(null);
        await disconnectGSC();
    };

    const handleConnect = () => {
        // Use the same client ID that the backend uses for token refresh
        const clientId = "751735189062-rpt4fatsgmp5svkir4h3jn64hvsulp6v.apps.googleusercontent.com";
        
        // Use environment-aware redirect URI for development
        const redirectUri = process.env.NODE_ENV === 'development' 
            ? "http://localhost:8080/gsc/oauth2callback" 
            : "https://app.blawgy.com/gsc/oauth2callback";
            
        const scope = encodeURIComponent("https://www.googleapis.com/auth/webmasters.readonly");
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&access_type=offline&prompt=consent`;

        window.location.href = authUrl;
    };

    const handleDateRangeChange = (e) => {
        let startDate;
        const isCustom = e.target.value === 'custom';

        setSelectedRange(e.target.value);

        if (isCustom) {
            setDateRange(prev => ({ ...prev, custom: true }));
            return;
        }

        switch (e.target.value) {
            case 'last7d':
                startDate = dayjs().subtract(7, 'day');
                break;
            case 'last28d':
                startDate = dayjs().subtract(28, 'day');
                break;
            case 'last6m':
                startDate = dayjs().subtract(180, 'day');
                break;
            case 'last12m':
                startDate = dayjs().subtract(365, 'day');
                break;
            default:
                startDate = dayjs().subtract(28, 'day');
        }

        const newDateRange = {
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: dayjs().format('YYYY-MM-DD'),
            custom: false
        };

        setDateRange(newDateRange);
        fetchGSCData(newDateRange);
    };

    const handleCustomDateChange = (type, value) => {
        setDateRange(prev => ({ ...prev, [type]: value }));
    };

    const toggleMetric = (metric) => {
        setVisibleMetrics(prev => ({
            ...prev,
            [metric]: !prev[metric]
        }));
    };

    // Reconnection Modal Component
    const ReconnectModal = () => {
        if (!showReconnectModal) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl shadow-lg max-w-md w-full m-4 p-6">
                    <div className="flex items-center mb-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="ml-3 text-lg font-semibold text-gray-900">Connection Issue</h3>
                    </div>

                    <div className="mb-6">
                        <p className="text-sm text-gray-600 mb-4">
                            {reconnectError || 'Your Google Search Console connection has expired and needs to be refreshed.'}
                        </p>
                        <p className="text-sm text-gray-500">
                            You can reconnect to restore access to your reports, or disconnect if you no longer want to use this feature.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleReconnectConnect}
                            className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-hover transition-colors font-medium"
                        >
                            Reconnect
                        </button>
                        <button
                            onClick={handleReconnectDisconnect}
                            className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                        >
                            Disconnect
                        </button>
                        <button
                            onClick={handleReconnectDismiss}
                            className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Disconnect Confirmation Modal
    const DisconnectConfirmModal = () => {
        if (!showDisconnectConfirm) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl shadow-lg max-w-md w-full m-4 p-6">
                    <div className="flex items-center mb-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="ml-3 text-lg font-semibold text-gray-900">Disconnect Google Search Console?</h3>
                    </div>

                    <div className="mb-6">
                        <p className="text-sm text-gray-600">
                            Are you sure you want to disconnect Google Search Console? You'll lose access to your traffic reports and search analytics until you reconnect.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowDisconnectConfirm(false)}
                            className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                setShowDisconnectConfirm(false);
                                disconnectGSC();
                            }}
                            disabled={disconnecting}
                            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                        >
                            {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (showDomainSelection) {
        return (
            <NavbarWrapper
                user={user}
                logout={logout}
                onShowBulkGenerate={() => setShowBulkGenerateModal(true)}
                onShowImageStyle={() => setShowImageStyleModal(true)}
                onShowSupport={() => setShowSupportModal(true)}
                onShowAdmin={() => setShowAdminPanel(true)}
                onShowSubscription={() => setShowSubscriptionModal(true)}
                updateCurrentSite={updateCurrentSite}
                currentSite={currentSite}
            >
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border p-8">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-semibold text-gray-900">Select Your Website</h2>
                            <p className="mt-2 text-sm text-gray-600">
                                Choose which Google Search Console property to connect to your <span className="font-medium">{siteSettings?.site}</span> site
                            </p>
                        </div>

                        <div className="space-y-3">
                            {availableGscSites.map((gscSite, index) => (
                                <button
                                    key={index}
                                    onClick={() => selectGscDomain(gscSite)}
                                    disabled={loading}
                                    className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="font-medium text-gray-900">{gscSite.displayName}</div>
                                    <div className="text-xs text-gray-500 mt-1">{gscSite.url}</div>
                                </button>
                            ))}
                        </div>

                        <div className="mt-6 pt-4 border-t">
                            <button
                                onClick={() => {
                                    setShowDomainSelection(false);
                                    setAvailableGscSites([]);
                                    setSelectionToken(null);
                                }}
                                className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                Cancel and go back
                            </button>
                        </div>

                        {error && (
                            <div className="mt-4 p-3 bg-red-50 rounded-lg">
                                <p className="text-sm text-center text-red-600">{error}</p>
                            </div>
                        )}
                    </div>
                </div>
            </NavbarWrapper>
        );
    }

    if (!isConnected) {
        return (
            <NavbarWrapper
                user={user}
                logout={logout}
                onShowBulkGenerate={() => setShowBulkGenerateModal(true)}
                onShowImageStyle={() => setShowImageStyleModal(true)}
                onShowSupport={() => setShowSupportModal(true)}
                onShowAdmin={() => setShowAdminPanel(true)}
                onShowSubscription={() => setShowSubscriptionModal(true)}
                updateCurrentSite={updateCurrentSite}
                currentSite={currentSite}
            >
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border p-8">
                        <div className="text-center">
                            <h2 className="text-2xl font-semibold text-gray-900">Connect Google Search Console</h2>
                            <p className="mt-3 text-sm text-gray-600">
                                Google's free report card for your site: which searches you appeared in, where you ranked, and who clicked.
                            </p>
                            <div className="mt-6 bg-gray-100 border border-gray-200 rounded-xl p-4">
                                <p className="text-sm text-gray-800">
                                    By connecting Google Search Console, you'll get insights about your site's performance while helping Blawgy generate more targeted content based on what your audience is actually searching for.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 text-center">
                            <p className="text-xs text-gray-500">You'll be asked to grant</p>
                            <div className="mt-2 text-xs text-gray-600 space-y-1.5">
                                <div className="flex items-center justify-center">
                                    <svg className="w-3.5 h-3.5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    Read-only access to Search Console data
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={handleConnect}
                                className="w-full flex items-center pointer-cursor justify-center px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                            >
                                <img
                                    src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png"
                                    alt="Google Logo"
                                    className="w-5 h-5 mr-3"
                                />
                                Connect with Google
                            </button>
                        </div>
                        {error && (
                            <div className="mt-4 p-3 bg-red-50 rounded-lg">
                                <p className="text-sm text-center text-red-600">
                                    {error}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </NavbarWrapper>
        );
    }

    return (
        <NavbarWrapper
            user={user}
            logout={logout}
            onShowBulkGenerate={() => setShowBulkGenerateModal(true)}
            onShowImageStyle={() => setShowImageStyleModal(true)}
            onShowSupport={() => setShowSupportModal(true)}
            onShowAdmin={() => setShowAdminPanel(true)}
            onShowSubscription={() => setShowSubscriptionModal(true)}
            updateCurrentSite={updateCurrentSite}
            currentSite={currentSite}
        >

            <div className="p-4 lg:p-12 lg:pt-8">
                {/* Header matching Dashboard layout */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12">
                    <div className="flex-1">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between w-full">
                            <div>
                                <h2 className="text-xl lg:text-2xl font-bold text-left mb-2">Google Search Console</h2>
                                {siteSettings?.gsc?.connected_site && (
                                    <p className="text-sm text-gray-500 text-left">
                                        Connected to: {siteSettings.gsc.connected_site.replace("sc-domain:", "").replace("https://", "").replace("http://", "")}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-3 mt-4 lg:mt-0">
                                {loading && (
                                    <LoaderIcon className="w-4 h-4 animate-spin text-gray-400" />
                                )}
                                <select
                                    className="border rounded-lg px-3 py-2 pr-8 text-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                    onChange={handleDateRangeChange}
                                    value={selectedRange}
                                    disabled={loading}
                                >
                                    <option value="last7d">Last 7 days</option>
                                    <option value="last28d">Last 28 days</option>
                                    <option value="last6m">Last 6 months</option>
                                    <option value="last12m">Last 12 months</option>
                                    <option value="custom">Custom</option>
                                </select>
                                {siteSettings?.gsc?.access_token && (
                                    <div className="relative group">
                                        <button
                                            onClick={() => setShowDisconnectConfirm(true)}
                                            disabled={disconnecting}
                                            className={`p-2 rounded-lg border transition-colors ${
                                                disconnecting
                                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                    : 'text-gray-500 border-gray-200 hover:text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                            </svg>
                                        </button>
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                            Disconnect
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {/* Custom date inputs - show below when custom is selected */}
                <div className={`flex gap-4 mb-6 transition-opacity ${dateRange.custom ? 'opacity-100' : 'opacity-0 hidden'}`}>
                    <input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                        className="border rounded-lg px-3 py-2"
                    />
                    <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                        className="border rounded-lg px-3 py-2"
                    />
                    <button
                        onClick={() => fetchGSCData(dateRange)}
                        disabled={loading}
                        className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Loading...' : 'Apply'}
                    </button>
                </div>

                {/* Scoped load-failure banner: without it a failed fetch renders
                    as empty charts, which reads like the site has no traffic. */}
                {(fetchErrors.traffic || fetchErrors.posts || fetchErrors.queries) && !loading && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p className="text-sm text-amber-800">
                            We couldn't load your Search Console data just now. Your data is safe.
                        </p>
                        <button
                            onClick={() => fetchGSCData()}
                            className="self-start sm:self-auto px-4 py-2 text-sm font-medium text-amber-800 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Traffic Overview Chart. Full-card skeleton only on first
                    load; refetches keep the card + legend mounted and swap
                    just the plot, so nothing jumps out from under the user. */}
                {loading && gscData.trafficData.length === 0 ? (
                    <ChartSkeleton />
                ) : (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Traffic Overview</h2>
                        {/* Custom Legend with Toggle Buttons */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => toggleMetric('clicks')}
                                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                                    visibleMetrics.clicks
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                                }`}
                            >
                                <div className={`w-3 h-0.5 ${visibleMetrics.clicks ? 'bg-emerald-400' : 'bg-gray-400'}`}></div>
                                Clicks
                            </button>
                            <button
                                onClick={() => toggleMetric('impressions')}
                                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                                    visibleMetrics.impressions
                                        ? 'bg-gray-200 text-gray-900 border border-gray-300'
                                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                                }`}
                            >
                                <div className={`w-3 h-0.5 ${visibleMetrics.impressions ? 'bg-gray-700' : 'bg-gray-400'}`}></div>
                                Impressions
                            </button>
                        </div>
                    </div>
                    {loading ? (
                        <ChartBodySkeleton />
                    ) : (
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={gscData.trafficData}
                                margin={{ top: 5, right: 60, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="keys"
                                    tickFormatter={(key) => dayjs(key).format('MMM D')}
                                    interval="preserveEnd"
                                    angle={-45}
                                    textAnchor="end"
                                    height={50}
                                />
                                {/* Left Y-axis for Clicks */}
                                {visibleMetrics.clicks && (
                                    <YAxis 
                                        yAxisId="left"
                                        orientation="left"
                                        stroke="#34D399"
                                        tickFormatter={(value) => value.toLocaleString()}
                                    />
                                )}
                                {/* Right Y-axis for Impressions */}
                                {visibleMetrics.impressions && (
                                    <YAxis 
                                        yAxisId="right"
                                        orientation="right"
                                        stroke="#1F2937"
                                        tickFormatter={(value) => {
                                            if (value >= 1000) {
                                                return (value / 1000).toFixed(value % 1000 === 0 ? 0 : 1) + 'K';
                                            }
                                            return value.toString();
                                        }}
                                    />
                                )}
                                <Tooltip
                                    labelFormatter={(key) => dayjs(key).format('MMM D, YYYY')}
                                    formatter={(value, name) => {
                                        return [value.toLocaleString(), name === 'Clicks' ? 'Clicks' : 'Impressions'];
                                    }}
                                />
                                {visibleMetrics.clicks && (
                                    <Line
                                        type="monotone"
                                        dataKey="clicks"
                                        stroke="#34D399"
                                        name="Clicks"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4 }}
                                        yAxisId="left"
                                    />
                                )}
                                {visibleMetrics.impressions && (
                                    <Line
                                        type="monotone"
                                        dataKey="impressions"
                                        stroke="#1F2937"
                                        name="Impressions"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4 }}
                                        yAxisId="right"
                                    />
                                )}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    )}
                </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Performing Posts */}
                    {loading && gscData.topPosts.length === 0 ? (
                        <TableSkeleton title="Top Performing Posts" />
                    ) : (
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Top Performing Posts</h2>
                            <select
                                className="border rounded-lg px-3 py-2 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:8px_8px] bg-no-repeat bg-[right_12px_center] pr-8 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                value={postsLimit}
                                disabled={loading}
                                onChange={(e) => {
                                    const newLimit = Number(e.target.value);
                                    setPostsLimit(newLimit);
                                    fetchTopPosts(newLimit);
                                }}
                            >
                                <option value="10">10 rows</option>
                                <option value="25">25 rows</option>
                                <option value="50">50 rows</option>
                                <option value="200">200 rows</option>
                            </select>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-2">Page</th>
                                        <th className="text-right p-2">Clicks</th>
                                        <th className="text-right p-2">Impressions</th>
                                    </tr>
                                </thead>
                                {loading ? (
                                    <TableBodySkeleton rows={Math.min(postsLimit, 10)} cols={3} />
                                ) : (
                                <tbody>
                                    {gscData.topPosts.map((post, index) => (
                                        <tr key={index} className="border-b">
                                            <td className="py-2 text-left">{post.keys[0]}</td>
                                            <td className="text-center">{post.clicks}</td>
                                            <td className="text-center">{post.impressions}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                )}
                            </table>
                        </div>
                    </div>
                    )}

                    {/* Top Search Queries */}
                    {loading && gscData.topQueries.length === 0 ? (
                        <TableSkeleton title="Top Search Queries" />
                    ) : (
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Top Search Queries</h2>
                            <div className="flex items-center gap-2">
                                <div className="relative group">
                                    <button
                                        onClick={addAllQueriesToKeywords}
                                        disabled={addingAll || pendingQueries.length === 0}
                                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                    >
                                        {addingAll ? 'Adding...' : 'Add all to keywords'}
                                    </button>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-max max-w-[240px] whitespace-normal text-center">
                                        {gscData.topQueries.length === 0
                                            ? 'No queries to add yet'
                                            : pendingQueries.length === 0
                                                ? 'All queries are already in your keywords'
                                                : 'Adds every query below to your keywords, skipping ones you already have'}
                                    </div>
                                </div>
                                <select
                                    className="border rounded-lg px-3 py-2 pr-8 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                    value={queriesLimit}
                                    disabled={loading}
                                    onChange={(e) => {
                                        const newLimit = Number(e.target.value);
                                        setQueriesLimit(newLimit);
                                        fetchTopQueries(newLimit);
                                    }}
                                >
                                    <option value="10">10 rows</option>
                                    <option value="25">25 rows</option>
                                    <option value="50">50 rows</option>
                                    <option value="200">200 rows</option>
                                </select>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-2">Query</th>
                                        <th className="text-center p-2">Clicks</th>
                                        <th className="text-center p-2">Impressions</th>
                                        <th className="p-2 w-10"><span className="sr-only">Add to keywords</span></th>
                                    </tr>
                                </thead>
                                {loading ? (
                                    <TableBodySkeleton rows={Math.min(queriesLimit, 10)} cols={4} />
                                ) : (
                                <tbody>
                                    {gscData.topQueries.map((query, index) => {
                                        const queryText = query.keys[0];
                                        const added = isQueryAdded(queryText);
                                        const adding = addingQueries.has(
                                            typeof queryText === 'string' ? queryText.trim().toLowerCase() : ''
                                        );
                                        return (
                                            <tr key={index} className="border-b">
                                                <td className={`py-2 text-left ${added ? 'text-gray-400' : ''}`}>{queryText}</td>
                                                <td className="text-center">{query.clicks}</td>
                                                <td className="text-center">{query.impressions}</td>
                                                <td className="py-2 text-right">
                                                    {added ? (
                                                        <span className="relative group inline-flex">
                                                            <span className="inline-flex items-center justify-center p-1 text-emerald-500">
                                                                <Check className="w-4 h-4" />
                                                            </span>
                                                            <span className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                                In your keywords
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <span className="relative group inline-flex">
                                                            <button
                                                                onClick={() => addQueryToKeywords(queryText)}
                                                                disabled={adding || addingAll}
                                                                aria-label="Add to keywords"
                                                                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {adding ? (
                                                                    <LoaderIcon className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <Plus className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                            <span className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                                Add to keywords
                                                            </span>
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                )}
                            </table>
                        </div>
                    </div>
                    )}
                </div>
            </div>
            <ReconnectModal />
            <DisconnectConfirmModal />
        </NavbarWrapper>
    );
};

export default ReportsPage;
