import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LogOutIcon,
    Settings2Icon,
    Users2Icon,
    CreditCard,
    HomeIcon,
    LayoutTemplateIcon,
    PenLineIcon,
    ChevronsUpDown,
    SearchIcon,
    ChartBarIcon,
    TrendingUpIcon,
    SparklesIcon,
    HeartHandshakeIcon,
    ChartNoAxesCombined
} from "lucide-react";
import { useImpersonation } from '../contexts/ImpersonationContext';
import { useBranding } from '../contexts/BrandingContext';
import TourNavbarIcon from './Tour/TourNavbarIcon';
import { hasWordPressConnection } from '../utils/cmsUtils';

const SitePlaceholder = ({ size, className = '' }) => (
    <div
        className={`${className} rounded-sm bg-gray-200`}
        style={{ width: size, height: size }}
        aria-hidden="true"
    />
);

// Kept at module scope on purpose: defining this inside NavbarWrapper makes React
// treat each render as a new component type, unmounting and remounting the <img>
// on every route change and flashing the placeholder.
const SiteIcon = ({ faviconUrl, size = 18, className = '' }) => {
    const [erroredUrl, setErroredUrl] = React.useState(null);
    if (!faviconUrl || erroredUrl === faviconUrl) {
        return <SitePlaceholder size={size} className={className} />;
    }
    return (
        <img
            src={faviconUrl}
            alt=""
            width={size}
            height={size}
            className={`${className} rounded-sm object-contain`}
            style={{ width: size, height: size }}
            onError={() => setErroredUrl(faviconUrl)}
            data-testid="site-favicon"
        />
    );
};

const NavbarWrapper = ({
    user,
    logout,
    onShowBulkGenerate,
    onShowImageStyle,
    onShowSupport,
    onShowAdmin,
    onShowSubscription,
    updateCurrentSite,
    currentSite,
    children
}) => {
    const navigate = useNavigate();
    const { currentSubscription, siteSettings } = useImpersonation();
    // Falls back to the Blawgy logo when the host is not a partner's.
    const { logo, name: brandName } = useBranding();
    const showPagesNav = hasWordPressConnection(siteSettings);
    const [showSitesDropdown, setShowSitesDropdown] = React.useState(false);
    const dropdownRef = React.useRef(null);

    const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setShowSitesDropdown(false);
        }
    };

    React.useEffect(() => {
        if (user?.sites && user.sites.length > 0 && !currentSite) {
            const siteObj = typeof user.sites[0] === 'string'
                ? { site: user.sites[0], email: user.email }
                : user.sites[0];
            updateCurrentSite(siteObj);
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [user, currentSite, updateCurrentSite]);

    const handleSiteChange = (site) => {
        if (site === "create-new-site") {
            // Add a site = full onboarding for the new domain (billed per site),
            // not the old lightweight connect-site modal.
            navigate('/onboarding?add=1');
        } else {
            const siteObj = typeof site === 'string'
                ? { site: site, email: user.email }
                : site;

            updateCurrentSite(siteObj);
        }
        setShowSitesDropdown(false);
    };

    const currentSiteName = typeof currentSite === 'object' ? currentSite?.site : currentSite;
    // Look up the full record by site name so we never fall through to a different
    // site's favicon when currentSite is stored as a slim object without faviconUrl.
    const matchedSite = currentSiteName
        ? user?.sites?.find((s) => (typeof s === 'object' ? s.site : s) === currentSiteName)
        : null;
    const currentSiteFavicon = (typeof currentSite === 'object' ? currentSite?.faviconUrl : null)
        || (matchedSite && typeof matchedSite === 'object' ? matchedSite.faviconUrl : null);
    // firstSiteFavicon only applies when there's no currentSite yet, paired with
    // the "show first site's name" placeholder rendered in the button below.
    const firstSiteFavicon = typeof user?.sites?.[0] === 'object' ? user.sites[0]?.faviconUrl : null;
    const computedFavicon = currentSiteFavicon || (currentSite ? null : firstSiteFavicon);

    // Remember the last valid favicon so brief state transitions don't flash the placeholder.
    const lastFaviconRef = React.useRef(null);
    if (computedFavicon) lastFaviconRef.current = computedFavicon;
    const stableFavicon = computedFavicon || lastFaviconRef.current;

    return (
        <div className="flex">
            <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-white text-gray-900 flex-col border-r border-gray-200">
                {/* Logo Section */}
                <div className="px-6 py-8 border-b border-gray-200">
                    <div className="flex justify-center">
                        <button onClick={() => navigate('/dashboard')} className="cursor-pointer hover:opacity-80 transition-opacity">
                            <img src={logo} alt={`${brandName} logo`} className="h-8" />
                        </button>
                    </div>
                </div>

                {/* Site Switcher Section */}
                <div className="pe-3 pb-6 pt-6 " ref={dropdownRef}>
                    <div className="ml-6 relative">
                        <button
                            data-testid="site-switcher"
                            onClick={() => {
                                if (user?.sites && user.sites.length > 0) {
                                    setShowSitesDropdown(!showSitesDropdown);
                                } else {
                                    navigate('/onboarding?add=1');
                                }
                            }}
                            className="flex items-center justify-between w-full rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors duration-200 border border-gray-200"
                        >
                            <div className="flex items-center min-w-0">
                                <SiteIcon
                                    faviconUrl={stableFavicon}
                                    size={18}
                                    className="mr-3 flex-shrink-0"
                                />
                                {currentSite ? (
                                    <span className="font-medium truncate text-sm">
                                        {typeof currentSite === 'string' ? currentSite : currentSite.site}
                                    </span>
                                ) : user?.sites && user.sites.length > 0 ? (
                                    <span className="font-medium truncate text-sm">
                                        {typeof user.sites[0] === 'string' ? user.sites[0] : user.sites[0].site}
                                    </span>
                                ) : (
                                    <span className="font-medium text-gray-500 truncate text-sm">
                                        Add a site to get started
                                    </span>
                                )}
                            </div>
                            {user?.sites && user.sites.length > 0 ? (
                                <ChevronsUpDown className="w-4 h-4 flex-shrink-0 ml-2" />
                            ) : (
                                <svg className="w-4 h-4 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                                </svg>
                            )}
                        </button>

                        {/* Dropdown menu */}
                        {showSitesDropdown && user?.sites && user.sites.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                                <div className="py-1 max-h-60 overflow-auto">
                                    {user.sites.map((site) => (
                                        <button
                                            key={typeof site === 'string' ? site : site.site}
                                            onClick={() => handleSiteChange(site)}
                                            className="flex items-center w-full px-3 py-2.5 text-sm text-gray-800 hover:bg-gray-50 transition-colors duration-150"
                                        >
                                            <SiteIcon
                                                faviconUrl={typeof site === 'object' ? site.faviconUrl : null}
                                                size={16}
                                                className="mr-3 text-gray-500"
                                            />
                                            <span>{typeof site === 'string' ? site : site.site}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="border-t border-gray-200">
                                    <button
                                        onClick={() => handleSiteChange("create-new-site")}
                                        className="flex items-center w-full px-3 py-2.5 text-sm text-gray-800 hover:bg-gray-50 transition-colors duration-150"
                                    >
                                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                                        </svg>
                                        <span>Add site</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation Sections: Create (make content) / Track (watch results) /
                    then workspace items. Labels only — routes and gating unchanged. */}
                <div className="flex-1 px-6 overflow-y-auto">
                    <nav className="space-y-1">
                        <p className="px-3 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Create</p>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center text-sm hover:bg-gray-100 px-3 py-2.5 rounded-lg w-full transition-colors duration-200 group"
                        >
                            <HomeIcon className="mr-3 group-hover:scale-110 transition-transform duration-200" size={18} />
                            <span className="font-medium">Content Plan</span>
                        </button>
                        {showPagesNav && (
                            <button
                                onClick={() => navigate('/pages')}
                                className="flex items-center text-sm hover:bg-gray-100 px-3 py-2.5 rounded-lg w-full transition-colors duration-200 group"
                            >
                                <LayoutTemplateIcon className="mr-3 group-hover:scale-110 transition-transform duration-200" size={18} />
                                <span className="font-medium">Pages</span>
                            </button>
                        )}
                        <button
                            data-tour="article-builder-btn"
                            title="Write one article yourself, step by step"
                            onClick={() => {
                                if (currentSubscription?.isActive) {
                                    navigate('/article-builder');
                                } else {
                                    onShowSubscription();
                                }
                            }}
                            className="flex items-center text-sm hover:bg-gray-100 px-3 py-2.5 rounded-lg w-full transition-colors duration-200 group"
                        >
                            <PenLineIcon className="mr-3 group-hover:scale-110 transition-transform duration-200" size={18} />
                            <span className="font-medium">Write</span>
                            {!currentSubscription?.isActive && (
                                <span className="ml-auto text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-medium">
                                    Pro
                                </span>
                            )}
                        </button>
                        <button
                            data-tour="keyword-finder-nav"
                            title="Topic ideas from real Google searches, ready to add to your plan"
                            onClick={() => {
                                if (currentSubscription?.isActive) {
                                    navigate('/keyword-finder');
                                } else {
                                    onShowSubscription();
                                }
                            }}
                            className="flex items-center text-sm hover:bg-gray-100 px-3 py-2.5 rounded-lg w-full transition-colors duration-200 group"
                        >
                            <SearchIcon className="mr-3 group-hover:scale-110 transition-transform duration-200" size={18} />
                            <span className="font-medium">Topics</span>
                            {!currentSubscription?.isActive && (
                                <span className="ml-auto text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-medium">
                                    Pro
                                </span>
                            )}
                        </button>
                        <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Track</p>
                        <button
                            title="Where your site ranks on Google and how it's moving"
                            onClick={() => {
                                if (currentSubscription?.features?.includes('seo_analysis')) {
                                    navigate('/seo-analysis');
                                } else {
                                    onShowSubscription();
                                }
                            }}
                            className="flex items-center text-sm hover:bg-gray-100 px-3 py-2.5 rounded-lg w-full transition-colors duration-200 group"
                        >
                            <TrendingUpIcon className="mr-3 group-hover:scale-110 transition-transform duration-200" size={18} />
                            <span className="font-medium">Rankings</span>
                            {!currentSubscription?.features?.includes('seo_analysis') && (
                                <span className="ml-auto text-xs bg-purple-400 text-purple-900 px-2 py-0.5 rounded-full font-medium">
                                    Pro+
                                </span>
                            )}
                        </button>
                        <button
                            title="Your Google Search Console data: clicks, impressions, queries"
                            onClick={() => navigate('/reports')}
                            className="flex items-center text-sm hover:bg-gray-100 px-3 py-2.5 rounded-lg w-full transition-colors duration-200 group"
                        >
                            <ChartBarIcon className="mr-3 group-hover:scale-110 transition-transform duration-200" size={18} />
                            <span className="font-medium">Search Console</span>
                        </button>
                        <button
                            title="See when ChatGPT and other AI tools mention your business"
                            onClick={() => {
                                if (currentSubscription?.isActive) {
                                    navigate('/ai-mentions');
                                } else {
                                    onShowSubscription();
                                }
                            }}
                            className="flex items-center text-sm hover:bg-gray-100 px-3 py-2.5 rounded-lg w-full transition-colors duration-200 group"
                        >
                            <SparklesIcon className="mr-3 group-hover:scale-110 transition-transform duration-200" size={18} />
                            <span className="font-medium">AI Mentions</span>
                            {!currentSubscription?.features?.includes('ai_mentions')
                                && !currentSubscription?.features?.includes('seo_analysis') && (
                                <span className="ml-auto text-xs bg-purple-400 text-purple-900 px-2 py-0.5 rounded-full font-medium">
                                    Pro+
                                </span>
                            )}
                        </button>
                        <div className="pt-4" />
                        <button
                            data-tour="settings-nav"
                            onClick={() => navigate('/settings')}
                            className="flex items-center text-sm hover:bg-gray-100 px-3 py-2.5 rounded-lg w-full transition-colors duration-200 group"
                        >
                            <Settings2Icon className="mr-3 group-hover:scale-110 transition-transform duration-200" size={18} />
                            <span className="font-medium">Settings</span>
                        </button>
                        <TourNavbarIcon />
                        {user?.isAdmin && (
                            <>
                                <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Admin</p>
                                <button
                                    data-testid="navbar-business"
                                    title="Internal business dashboard: revenue, conversion, LTV"
                                    onClick={() => navigate('/business')}
                                    className="flex items-center text-sm hover:bg-gray-100 px-3 py-2.5 rounded-lg w-full transition-colors duration-200 group"
                                >
                                    <ChartNoAxesCombined className="mr-3 group-hover:scale-110 transition-transform duration-200" size={18} />
                                    <span className="font-medium">Business</span>
                                </button>
                                <button
                                    data-testid="navbar-admin"
                                    onClick={onShowAdmin}
                                    className="flex items-center text-sm hover:bg-gray-100 px-3 py-2.5 rounded-lg w-full transition-colors duration-200 group"
                                >
                                    <Users2Icon className="mr-3 group-hover:scale-110 transition-transform duration-200" size={18} />
                                    <span className="font-medium">User Management</span>
                                </button>
                            </>
                        )}
                    </nav>
                </div>

                {/* Bottom Section */}
                <div className="p-6 pt-4 border-t border-gray-200 space-y-2">
                    <button
                        onClick={onShowSubscription}
                        className="flex items-center text-sm hover:bg-gray-100 px-3 py-2.5 rounded-lg w-full transition-colors duration-200 group"
                    >
                        <CreditCard className="mr-3 group-hover:scale-110 transition-transform duration-200" size={18} />
                        <span className="font-medium">
                            {currentSubscription?.isActive ? 'Billing' : 'Subscribe'}
                        </span>
                        {!currentSubscription?.isActive && (
                            <span className="ml-auto text-xs bg-green-400 text-green-900 px-2 py-0.5 rounded-full font-medium">
                                Upgrade
                            </span>
                        )}
                    </button>
                    <button
                        data-testid="navbar-help"
                        onClick={onShowSupport}
                        className="flex items-center text-sm hover:bg-gray-100 px-3 py-2.5 rounded-lg w-full transition-colors duration-200 group"
                    >
                        <HeartHandshakeIcon className="mr-3 group-hover:scale-110 transition-transform duration-200" size={18} />
                        <span className="font-medium">Help</span>
                    </button>
                    <button
                        className="flex items-center text-sm hover:bg-gray-100 px-3 py-2.5 rounded-lg w-full transition-colors duration-200 group"
                        onClick={logout}
                    >
                        <LogOutIcon className="mr-3 group-hover:scale-110 transition-transform duration-200" size={18} />
                        <span className="font-medium">Log out</span>
                    </button>
                </div>
            </aside>
            <main className="flex-1 lg:ml-64 pb-16 lg:pb-0 min-w-0 max-w-full overflow-x-hidden">
                {children}
            </main>

            {/* Mobile bottom navigation */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 flex justify-around items-center h-14">
                <button onClick={() => navigate('/dashboard')} className="flex flex-col items-center justify-center flex-1 py-2 text-gray-500 hover:text-gray-900">
                    <HomeIcon size={20} />
                    <span className="text-[10px] mt-0.5">Content Plan</span>
                </button>
                <button onClick={() => navigate('/settings')} className="flex flex-col items-center justify-center flex-1 py-2 text-gray-500 hover:text-gray-900">
                    <Settings2Icon size={20} />
                    <span className="text-[10px] mt-0.5">Settings</span>
                </button>
                {showPagesNav && (
                    <button onClick={() => navigate('/pages')} className="flex flex-col items-center justify-center flex-1 py-2 text-gray-500 hover:text-gray-900">
                        <LayoutTemplateIcon size={20} />
                        <span className="text-[10px] mt-0.5">Pages</span>
                    </button>
                )}
                <button onClick={onShowSubscription} className="flex flex-col items-center justify-center flex-1 py-2 text-gray-500 hover:text-gray-900">
                    <CreditCard size={20} />
                    <span className="text-[10px] mt-0.5">Billing</span>
                </button>
                <button data-testid="navbar-help-mobile" onClick={onShowSupport} className="flex flex-col items-center justify-center flex-1 py-2 text-gray-500 hover:text-gray-900">
                    <HeartHandshakeIcon size={20} />
                    <span className="text-[10px] mt-0.5">Help</span>
                </button>
                <button onClick={logout} className="flex flex-col items-center justify-center flex-1 py-2 text-gray-500 hover:text-gray-900">
                    <LogOutIcon size={20} />
                    <span className="text-[10px] mt-0.5">Log out</span>
                </button>
            </nav>
        </div>
    );
};

export default NavbarWrapper; 