import React, { useState, useEffect, useCallback } from 'react';
import { useImpersonation } from '../../contexts/ImpersonationContext';
import apiClient from '../../utils/apiClient';
import CompLinksTab from './CompLinksTab';
import TestAccountsTab from './TestAccountsTab';
import PartnersTab from './PartnersTab';
import ReportsTab from './ReportsTab';

const AdminPanel = ({ adminEmail }) => {
  const [activeTab, setActiveTab] = useState('sites');
  const [sites, setSites] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingFlags, setPendingFlags] = useState({});
  const [flagError, setFlagError] = useState('');
  const { startImpersonation } = useImpersonation();

  const loadSites = useCallback(async () => {
    if (!adminEmail) return;

    try {
      const response = await apiClient.get('/admin/sites', {
        params: { adminEmail }
      });

      if (response.data.success) {
        setSites(response.data.sites);
      }
    } catch (error) {
      console.error('Failed to load sites:', error);
    }
  }, [adminEmail]);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  const handleImpersonate = async (site) => {
    if (!site?.site) {
      console.error('Cannot impersonate: site name is missing');
      return;
    }
    try {
      const response = await apiClient.get('/admin/site-details', {
        params: {
          adminEmail,
          site: site.site
        }
      });

      if (response.data.success) {
        localStorage.removeItem('currentSite');
        startImpersonation(response.data.siteData);
      }
    } catch (error) {
      console.error('Error impersonating site:', error);
    }
  };

  const handleToggleSearchIntent = async (site) => {
    const siteName = site?.site;
    if (!siteName || pendingFlags[siteName]) return;

    const next = !site.searchIntent;

    setFlagError('');
    setPendingFlags((prev) => ({ ...prev, [siteName]: true }));
    // Optimistically flip local state.
    setSites((prev) =>
      prev.map((s) => (s.site === siteName ? { ...s, searchIntent: next } : s))
    );

    try {
      const response = await apiClient.patch('/admin/site-flags', {
        adminEmail,
        site: siteName,
        searchIntent: next,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update search intent');
      }
    } catch (error) {
      // Revert the flip on failure.
      setSites((prev) =>
        prev.map((s) => (s.site === siteName ? { ...s, searchIntent: !next } : s))
      );
      setFlagError(`Could not update search intent for ${siteName}`);
      console.error('Failed to update search intent:', error);
    } finally {
      setPendingFlags((prev) => {
        const copy = { ...prev };
        delete copy[siteName];
        return copy;
      });
    }
  };

  const filteredSites = sites.filter(site =>
    (site.site && site.site.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (site.email && site.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const renderTabButton = (key, label) => (
    <button
      type="button"
      data-testid={`admin-tab-${key}`}
      onClick={() => setActiveTab(key)}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        activeTab === key
          ? 'border-primary text-primary'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="p-6">
      <div className="mb-6 flex gap-2 border-b border-gray-200">
        {renderTabButton('sites', 'Sites')}
        {renderTabButton('reports', 'Reports')}
        {renderTabButton('comp-links', 'Comp Links')}
        {renderTabButton('test-accounts', 'Test Accounts')}
        {renderTabButton('partners', 'White Label')}
      </div>

      {activeTab === 'sites' && (
        <div>
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search sites..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          {flagError && (
            <p className="mb-4 text-sm text-red-600">{flagError}</p>
          )}

          <div className="grid gap-4">
            {filteredSites.map((site, index) => {
              const isPending = !!pendingFlags[site.site];
              return (
              <div key={site.site || site.email || index} className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{site.site || 'Unknown site'}</p>
                    <span className={`text-sm px-2 py-1 rounded ${site.managed ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                      }`}>
                      {site.managed ? 'Managed' : 'Self-serve'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    <p>Type: {site.blogType || 'Not set'}</p>
                    {site.email && <p>Email: {site.email}</p>}
                    <p>Articles: {site.blogs}</p>
                    <p>Last updated: {site.lastUpdated ? new Date(site.lastUpdated).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500">Search Intent</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!site.searchIntent}
                      aria-label={`Search Intent for ${site.site || 'site'}`}
                      data-testid={`search-intent-toggle-${site.site}`}
                      disabled={isPending || !site.site}
                      onClick={() => handleToggleSearchIntent(site)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                        site.searchIntent ? 'bg-primary' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          site.searchIntent ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <button
                    onClick={() => handleImpersonate(site)}
                    className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-hover transition-colors"
                  >
                    Manage Site
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <ReportsTab adminEmail={adminEmail} sites={sites} />
      )}

      {activeTab === 'comp-links' && (
        <CompLinksTab adminEmail={adminEmail} />
      )}

      {activeTab === 'partners' && (
        <PartnersTab />
      )}

      {activeTab === 'test-accounts' && (
        <TestAccountsTab adminEmail={adminEmail} />
      )}
    </div>
  );
};

export default AdminPanel;
