import React, { useState, useRef } from 'react';
import apiClient from '../../utils/apiClient';

// Admin view of the weekly exec report email: pick any customer site from the
// dropdown and see exactly what their report looks like right now. The backend
// builds it live from GSC + GPT (10-30s), so we keep an honest loading state
// and guard against out-of-order responses when the admin switches sites
// mid-build.
const ReportsTab = ({ adminEmail, sites }) => {
  const [selectedSite, setSelectedSite] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);
  const requestSeq = useRef(0);

  // Only GSC-connected customers: without Search Console the report has no
  // numbers to show, so listing them here would just be noise.
  const sortedSites = (sites || [])
    .filter((s) => s.site && s.gscConnected)
    .sort((a, b) => a.site.localeCompare(b.site));
  const hiddenCount = (sites || []).filter((s) => s.site && !s.gscConnected).length;

  const loadReport = async (site) => {
    setSelectedSite(site);
    setReport(null);
    setError('');
    if (!site) return;

    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const response = await apiClient.get('/admin/exec-report', {
        params: { adminEmail, site },
      });
      if (seq !== requestSeq.current) return; // a newer selection superseded this one
      if (response.data.success) {
        setReport(response.data);
      } else {
        setError(response.data.message || 'Failed to build report');
      }
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(err.response?.data?.message || 'Failed to build report');
      console.error('Failed to load exec report:', err);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  const statusLine = report && (
    <div className="mb-4 rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-600 space-y-1">
      <p>
        <span className="font-medium text-gray-800">Recipient:</span>{' '}
        {report.to || <span className="text-red-600">no owner email on file</span>}
      </p>
      <p>
        <span className="font-medium text-gray-800">Subject:</span> {report.subject}
      </p>
      <p>
        <span className="font-medium text-gray-800">Report email:</span>{' '}
        {report.reportEmail?.enabled ? (
          <>
            enabled ({report.reportEmail.cadence}), last sent{' '}
            {report.reportEmail.lastSentAt
              ? new Date(report.reportEmail.lastSentAt).toLocaleDateString()
              : 'never'}
          </>
        ) : (
          <span className="text-amber-600">not enabled for this customer</span>
        )}
      </p>
      {Array.isArray(report.meta?.notes) && report.meta.notes.length > 0 && (
        <p className="text-xs text-gray-400">{report.meta.notes.join(' · ')}</p>
      )}
    </div>
  );

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        The exact weekly report each customer gets, built live from Search Console.
        Viewing here never sends anything or changes their send schedule.
        {hiddenCount > 0 && (
          <span className="block mt-1 text-xs text-gray-400">
            {hiddenCount} customer{hiddenCount === 1 ? '' : 's'} without Search Console connected {hiddenCount === 1 ? 'is' : 'are'} not listed.
          </span>
        )}
      </p>

      <div className="mb-6">
        <select
          value={selectedSite}
          onChange={(e) => loadReport(e.target.value)}
          data-testid="report-site-select"
          className="w-full p-2 border rounded-lg bg-white"
        >
          <option value="">Select a customer…</option>
          {sortedSites.map((s) => (
            <option key={s.site} value={s.site}>
              {s.site}
              {s.email ? ` — ${s.email}` : ' — managed'}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow text-sm text-gray-600">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Building the report from live Search Console data, this usually takes 10 to 30 seconds…
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => loadReport(selectedSite)}
            className="ml-4 text-red-700 underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {report && !loading && (
        <div>
          {statusLine}
          <iframe
            title={`Weekly report for ${report.site}`}
            srcDoc={report.html}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            data-testid="report-frame"
            className="w-full bg-white rounded-lg shadow border border-gray-200"
            style={{ height: '65vh' }}
          />
        </div>
      )}
    </div>
  );
};

export default ReportsTab;
