import React, { useState, useEffect } from 'react';
import {
    Plus,
    Trash2,
    Edit,
    Copy,
    Check,
    RotateCcw,
    Play,
    AlertCircle,
    CheckCircle,
    Zap,
    LoaderIcon,
    XIcon
} from 'lucide-react';
import apiClient from '../utils/apiClient';
import { toast } from 'react-hot-toast';

const WebhookTab = () => {
    const [webhooks, setWebhooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingWebhook, setEditingWebhook] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [copiedToken, setCopiedToken] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        webhookUrl: '',
        validity: 'no_expiry',
        events: ['blog.created', 'blog.updated', 'blog.published', 'blog.failed'],
        maxRetries: 3
    });
    const [showTestModal, setShowTestModal] = useState(false);
    const [testingWebhookId, setTestingWebhookId] = useState(null);
    const [testEvent, setTestEvent] = useState('blog.created');
    const [testResult, setTestResult] = useState(null);
    const [testLoading, setTestLoading] = useState(false);

    const validityOptions = [
        { value: '30_days', label: '30 Days' },
        { value: '90_days', label: '90 Days' },
        { value: 'no_expiry', label: 'No Expiry' }
    ];

    const eventOptions = [
        { value: 'blog.created', label: 'Blog Created' },
        { value: 'blog.updated', label: 'Blog Updated' },
        { value: 'blog.published', label: 'Blog Published' },
        { value: 'blog.failed', label: 'Blog Failed' }
    ];

    useEffect(() => {
        fetchWebhooks();
    }, []);

    const fetchWebhooks = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/api/webhooks');
            setWebhooks(response.data.webhooks || []);
        } catch (error) {
            console.error('Error fetching webhooks:', error);
            toast.error('Failed to load webhooks');
        } finally {
            setLoading(false);
        }
    };

    // Basic client-side validation for the webhook form. Returns true if valid,
    // otherwise surfaces a toast and returns false.
    const validateWebhookForm = () => {
        if (!formData.name.trim()) {
            toast.error('Webhook name is required');
            return false;
        }
        let url;
        try {
            url = new URL(formData.webhookUrl);
        } catch {
            toast.error('Please enter a valid webhook URL');
            return false;
        }
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            toast.error('Webhook URL must start with http:// or https://');
            return false;
        }
        return true;
    };

    const handleCreateWebhook = async () => {
        if (!validateWebhookForm()) return;
        if (submitting) return;
        try {
            setSubmitting(true);
            await apiClient.post('/api/webhooks', formData);
            toast.success('Webhook created successfully');
            setShowCreateModal(false);
            resetForm();
            fetchWebhooks();
        } catch (error) {
            console.error('Error creating webhook:', error);
            toast.error(error.response?.data?.message || 'Failed to create webhook');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateWebhook = async () => {
        if (!validateWebhookForm()) return;
        if (submitting) return;
        try {
            setSubmitting(true);
            await apiClient.put(`/api/webhooks/${editingWebhook.id}`, formData);
            toast.success('Webhook updated successfully');
            setShowEditModal(false);
            setEditingWebhook(null);
            resetForm();
            fetchWebhooks();
        } catch (error) {
            console.error('Error updating webhook:', error);
            toast.error(error.response?.data?.message || 'Failed to update webhook');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteWebhook = async (webhookId) => {
        if (!window.confirm('Are you sure you want to delete this webhook?')) return;

        try {
            await apiClient.delete(`/api/webhooks/${webhookId}`);
            toast.success('Webhook deleted successfully');
            fetchWebhooks();
        } catch (error) {
            console.error('Error deleting webhook:', error);
            toast.error('Failed to delete webhook');
        }
    };

    const handleRegenerateToken = async (webhookId) => {
        try {
            await apiClient.post(`/api/webhooks/${webhookId}/regenerate-token`);
            toast.success('Token regenerated successfully');
            fetchWebhooks();
        } catch (error) {
            console.error('Error regenerating token:', error);
            toast.error('Failed to regenerate token');
        }
    };

    const handleOpenTestModal = (webhookId) => {
        setTestingWebhookId(webhookId);
        setTestEvent('blog.created');
        setTestResult(null);
        setShowTestModal(true);
    };

    const handleTestWebhook = async () => {
        if (!testingWebhookId) return;
        setTestLoading(true);
        setTestResult(null);
        try {
            const response = await apiClient.post(`/api/webhooks/${testingWebhookId}/test`, { event: testEvent });
            setTestResult(response.data);
        } catch (error) {
            setTestResult({ success: false, error: error.response?.data?.message || 'Failed to test webhook' });
        } finally {
            setTestLoading(false);
        }
    };

    const copyToClipboard = async (text, webhookId) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedToken(webhookId);
            toast.success('Copied to clipboard');
            setTimeout(() => setCopiedToken(null), 2000);
        } catch (error) {
            toast.error('Failed to copy to clipboard');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            webhookUrl: '',
            validity: 'no_expiry',
            events: ['blog.created', 'blog.updated', 'blog.published', 'blog.failed'],
            maxRetries: 3
        });
    };

    const openEditModal = (webhook) => {
        setEditingWebhook(webhook);
        setFormData({
            name: webhook.name,
            webhookUrl: webhook.webhookUrl,
            validity: webhook.validity,
            events: webhook.events,
            maxRetries: webhook.maxRetries
        });
        setShowEditModal(true);
    };

    const getStatusBadge = (webhook) => {
        if (!webhook.isActive) {
            return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">Inactive</span>;
        }
        if (webhook.isExpired) {
            return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-600 rounded-full">Expired</span>;
        }
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-600 rounded-full">Active</span>;
    };

    const getLastTestStatus = (webhook) => {
        if (!webhook.lastTest) {
            return <span className="text-gray-400">Never tested</span>;
        }

        const status = webhook.lastTestStatus;
        if (status >= 200 && status < 300) {
            return <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" />Success</span>;
        } else {
            return <span className="text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />Failed</span>;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoaderIcon className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 w-full text-left max-w-4xl">
            <div className="flex justify-end items-center">
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors text-sm font-medium inline-flex items-center"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Webhook
                </button>
            </div>

            {webhooks.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No webhooks yet</h3>
                    <p className="text-gray-600">Create your first webhook to start receiving notifications</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <table className="w-full">
                        <thead className="bg-gray-50 text-left">
                            <tr>
                                <th className="px-4 py-3 font-medium text-gray-700">Webhook</th>
                                <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                                <th className="px-4 py-3 font-medium text-gray-700">Last Test</th>
                                <th className="px-4 py-3 font-medium text-gray-700">Events</th>
                                <th className="px-4 py-3 font-medium text-gray-700 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {webhooks.map((webhook) => (
                                <tr key={webhook.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{webhook.name}</div>
                                            <div className="text-sm text-gray-500 truncate max-w-xs">{webhook.webhookUrl}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-gray-400">Token:</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                                        {typeof webhook.authToken === 'string' && webhook.authToken.length >= 8
                                                            ? `${webhook.authToken.substring(0, 4)}••••••••${webhook.authToken.substring(webhook.authToken.length - 4)}`
                                                            : '••••••••••••••••'}
                                                    </span>
                                                    <button
                                                        onClick={() => webhook.authToken && copyToClipboard(webhook.authToken, webhook.id)}
                                                        className="text-gray-400 hover:text-gray-600"
                                                    >
                                                        {copiedToken === webhook.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {getStatusBadge(webhook)}
                                    </td>
                                    <td className="px-4 py-3">
                                        {getLastTestStatus(webhook)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {webhook.events.map((event) => (
                                                <span key={event} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">{event}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleOpenTestModal(webhook.id)}
                                                className="p-2 text-gray-400 hover:text-gray-700 disabled:opacity-50"
                                                title="Test webhook"
                                            >
                                                <Play className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleRegenerateToken(webhook.id)}
                                                className="p-2 text-gray-400 hover:text-orange-600"
                                                title="Regenerate token"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => openEditModal(webhook)}
                                                className="p-2 text-gray-400 hover:text-gray-700"
                                                title="Edit webhook"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteWebhook(webhook.id)}
                                                className="p-2 text-gray-400 hover:text-red-600"
                                                title="Delete webhook"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Documentation */}
            <div className="bg-gray-100 rounded-lg p-6 border border-gray-200 mt-8">
                <h4 className="text-lg font-medium text-gray-900 mb-4">How to Set Up Webhooks</h4>
                <div className="space-y-4 text-sm text-gray-800">
                    <div>
                        <h5 className="font-medium mb-2">1. Create Your Webhook Endpoint</h5>
                        <p>Set up an HTTP endpoint on your server that can receive POST requests. This endpoint should:</p>
                        <ul className="list-disc list-inside mt-1 space-y-1 ml-4">
                            <li>Accept POST requests</li>
                            <li>Return a 2xx status code (200, 201, 202) for successful processing</li>
                            <li>Handle JSON payloads</li>
                            <li>Be publicly accessible (HTTPS recommended)</li>
                        </ul>
                    </div>

                    <div>
                        <h5 className="font-medium mb-2">2. Add Your Webhook URL</h5>
                        <p>Enter your endpoint URL in the "Webhook URL" field when creating a webhook. Example: <code className="bg-gray-100 px-1 rounded">https://yourdomain.com/api/webhooks/blawgy</code></p>
                    </div>

                    <div>
                        <h5 className="font-medium mb-2">3. Verify the Webhook Token</h5>
                        <p>When you receive webhook requests, verify they're from Blawgy by checking the <code className="bg-gray-100 px-1 rounded">X-Blawgy-Token</code> header. This header contains your webhook's authentication token.</p>
                    </div>

                    <div>
                        <h5 className="font-medium mb-2">4. Process the Webhook Data</h5>
                        <p>Each webhook request will include a JSON payload with:</p>
                        <ul className="list-disc list-inside mt-1 space-y-1 ml-4">
                            <li><code className="bg-gray-100 px-1 rounded">event</code> - The type of event (blog.created, blog.updated, etc.)</li>
                            <li><code className="bg-gray-100 px-1 rounded">timestamp</code> - When the event occurred</li>
                            <li><code className="bg-gray-100 px-1 rounded">data</code> - The blog post data</li>
                        </ul>
                    </div>

                    <div>
                        <h5 className="font-medium mb-2">Example Webhook Payload</h5>
                        <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                            {`{
    "event": "blog.created",
    "timestamp": "2024-01-15T10:30:00Z",
    "blog": {
        "_id": "sample_blog_id",
        "title": "Sample Blog Title",
        "keywords": ["sample", "blog", "keywords"],
        "blogContent": "<div class='sample-content'>Sample blog content here.</div>",
        "blogStatus": "draft",
        "articleSummary": "This is a sample summary for the blog.",
        "blogTitle": "Sample Blog Title",
        "imageUrl": "https://example.com/sample-image.jpg",
        "lastUpdated": "2024-01-15T10:30:00Z",
        "metaDescription": "This is a sample meta description for the blog.",
        "metaKeywords": "sample, blog, meta, keywords",
        "failureReason": null
    }
}`}
                        </pre>
                    </div>

                    <div>
                        <h5 className="font-medium mb-2">Security Best Practices</h5>
                        <ul className="list-disc list-inside mt-1 space-y-1 ml-4">
                            <li>Always verify the <code className="bg-gray-100 px-1 rounded">X-Blawgy-Token</code> header</li>
                            <li>Use HTTPS for your webhook endpoint</li>
                            <li>Implement rate limiting on your endpoint</li>
                            <li>Log webhook requests for debugging</li>
                            <li>Return appropriate HTTP status codes</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Create Webhook Modal */}
            {showCreateModal && (
                <WebhookModal
                    title="Create New Webhook"
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleCreateWebhook}
                    submitting={submitting}
                    onClose={() => {
                        setShowCreateModal(false);
                        resetForm();
                    }}
                    validityOptions={validityOptions}
                    eventOptions={eventOptions}
                />
            )}

            {/* Edit Webhook Modal */}
            {showEditModal && editingWebhook && (
                <WebhookModal
                    title="Edit Webhook"
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleUpdateWebhook}
                    submitting={submitting}
                    onClose={() => {
                        setShowEditModal(false);
                        setEditingWebhook(null);
                        resetForm();
                    }}
                    validityOptions={validityOptions}
                    eventOptions={eventOptions}
                />
            )}
            {showTestModal && (
                <TestWebhookModal
                    eventOptions={eventOptions}
                    testEvent={testEvent}
                    setTestEvent={setTestEvent}
                    onClose={() => setShowTestModal(false)}
                    onTest={handleTestWebhook}
                    testLoading={testLoading}
                    testResult={testResult}
                />
            )}
        </div>
    );
};

const WebhookModal = ({ title, formData, setFormData, onSubmit, submitting, onClose, validityOptions, eventOptions }) => {
    const handleEventToggle = (event) => {
        const newEvents = formData.events.includes(event)
            ? formData.events.filter(e => e !== event)
            : [...formData.events, event];
        setFormData({ ...formData, events: newEvents });
    };

    // Ensure maxRetries does not exceed 3
    const handleMaxRetriesChange = (e) => {
        let value = parseInt(e.target.value);
        if (value > 3) value = 3;
        if (value < 1 || isNaN(value)) value = 1;
        setFormData({ ...formData, maxRetries: value });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6">
                    <div className="space-y-6">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Webhook Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                placeholder="My Webhook"
                            />
                        </div>
                        {/* URL */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Webhook URL
                            </label>
                            <input
                                type="url"
                                value={formData.webhookUrl}
                                onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                placeholder="https://your-domain.com/webhook"
                            />
                        </div>
                        {/* Validity */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Token Validity
                            </label>
                            <select
                                value={formData.validity}
                                onChange={(e) => setFormData({ ...formData, validity: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                            >
                                {validityOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {/* Events */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Events to Listen For
                            </label>
                            <div className="space-y-2">
                                {eventOptions.map((event) => (
                                    <label key={event.value} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={formData.events.includes(event.value)}
                                            onChange={() => handleEventToggle(event.value)}
                                            className="h-4 w-4 text-primary focus:ring-gray-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">{event.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        {/* Max Retries */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Max Retries
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="3"
                                value={formData.maxRetries}
                                onChange={handleMaxRetriesChange}
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={submitting}
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting
                            ? (title.includes('Create') ? 'Creating...' : 'Updating...')
                            : (title.includes('Create') ? 'Create Webhook' : 'Update Webhook')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const TestWebhookModal = ({ eventOptions, testEvent, setTestEvent, onClose, onTest, testLoading, testResult }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold">Test Webhook</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Event to Simulate</label>
                        <select
                            value={testEvent}
                            onChange={e => setTestEvent(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                        >
                            {eventOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <button
                            onClick={onTest}
                            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors text-sm font-medium"
                            disabled={testLoading}
                        >
                            {testLoading ? 'Testing...' : 'Send Test'}
                        </button>
                    </div>
                    {testResult && (
                        <div className={`rounded p-3 text-sm ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                            {testResult.success ? (
                                <>
                                    <strong>Success!</strong> {testResult.statusCode ? `HTTP ${testResult.statusCode}` : ''}
                                </>
                            ) : (
                                <>
                                    <strong>Failed:</strong> {testResult.error || 'Unknown error'}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WebhookTab; 