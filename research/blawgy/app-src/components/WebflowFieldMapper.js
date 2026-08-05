import React, { useState, useEffect, useCallback } from 'react';
import { LoaderIcon, X } from 'lucide-react';
import apiClient from '../utils/apiClient';

const WebflowFieldMapper = ({ settings, onSettingsChange, onFetchedFieldsChange }) => {
    const [loading, setLoading] = useState(false);
    const [webflowFields, setWebflowFields] = useState([]);
    const [mappings, setMappings] = useState(settings.fields || {});
    const [error, setError] = useState('');
    const blawgFields = [
        { id: 'slug', name: 'Blog Slug', description: 'URL-friendly version of the title' },
        { id: 'name', name: 'Blog Title', description: 'Title of the blog post' },
        { id: 'post-body', name: 'Blog Body', description: 'Main body of the blog post' },
        { id: 'post-summary', name: 'Post Summary', description: 'Short summary/excerpt of the blog post' },
        { id: 'image', name: 'Blog Image', description: 'Featured image for the blog post' },
        { id: 'image-alt', name: 'Image Alt Text', description: 'Alt text for the featured image' },
        { id: 'date', name: 'Blog Date', description: 'Date of the blog post' },
        { id: 'meta-title', name: 'Meta Title', description: 'Meta title for the blog post' },
        { id: 'meta-description', name: 'Meta Description', description: 'Meta description for the blog post' },
    ];

    const fetchWebflowFields = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            const response = await apiClient.get('/webflow/fields', {
                params: {
                    apiToken: settings.apiToken,
                    collectionId: settings.collectionId
                }
            });

            if (response.data.success) {
                setWebflowFields(response.data.fields);
                onFetchedFieldsChange(response.data.fields);
            } else {
                setError(response.data.message || 'Failed to fetch Webflow fields');
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Error fetching Webflow fields');
            console.error('Error fetching Webflow fields:', error);
        } finally {
            setLoading(false);
        }
    }, [settings.apiToken, settings.collectionId, onFetchedFieldsChange]);

    useEffect(() => {
        if (settings.apiToken && settings.collectionId) {
            fetchWebflowFields();
        }
        if (settings.fields) {
            setMappings(settings.fields);
        }
    }, [fetchWebflowFields, settings.apiToken, settings.collectionId, settings.fields]);

    useEffect(() => {
        // This will trigger a re-render when mappings change
        // No need to do anything inside this effect
    }, [mappings]);

    const handleDragStart = (e, fieldId) => {
        e.dataTransfer.setData('fieldId', fieldId);
    };

    const handleDrop = (e, slug) => {
        e.preventDefault();
        const webflowSlug = e.dataTransfer.getData('fieldId');
        const newMappings = {
            ...mappings,
            [slug]: webflowSlug
        };
        setMappings(newMappings);
        onSettingsChange({
            ...settings,
            fields: newMappings
        });
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const removeMapping = (slug) => {
        const newMappings = { ...mappings };
        delete newMappings[slug];
        setMappings(newMappings);
        onSettingsChange({
            ...settings,
            fields: newMappings
        });
    };

    const getWebflowFieldName = (fieldId) => {
        const field = webflowFields.find(f => f.id === fieldId);
        return field ? field.name : fieldId;
    };

    const isFieldMapped = (fieldId) => {
        return Object.values(mappings).includes(fieldId);
    };

    return (
        <div className="space-y-6 rounded-lg">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Data Field Mapper</h2>
                <button
                    onClick={fetchWebflowFields}
                    className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
                >
                    Refresh Fields
                </button>
            </div>

            <p className="text-gray-600">
                Drag fields from the left column and drop them onto the corresponding blog fields on the right.
            </p>

            {error && (
                <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <LoaderIcon className="w-6 h-6 animate-spin text-primary" />
                    <span className="ml-2">Loading Webflow fields...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="border rounded-lg shadow-sm overflow-hidden bg-white">
                        <div className="p-4 border-b">
                            <h3 className="text-lg font-semibold">Source Fields</h3>
                            <p className="text-sm text-gray-500">Your existing webflow collection fields</p>
                        </div>

                        <div className="p-4 bg-white">
                            {webflowFields.length === 0 ? (
                                <div className="text-sm text-gray-500 py-4 text-center">
                                    No fields available. Please check your Webflow credentials.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {webflowFields.map(field => (
                                        <div
                                            key={field.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, field.slug)}
                                            className={`p-3 border rounded-md cursor-move hover:bg-gray-50 flex justify-between items-center ${isFieldMapped(field.slug) ? 'bg-green-50 border-green-200' : 'bg-white'
                                                }`}
                                        >
                                            <div>
                                                <div className="font-medium">{field.name} {field.isRequired ? <span className="text-red-500">*</span> : null}</div>
                                                <div className="text-xs text-gray-500">Field ID: {field.id}</div>
                                            </div>
                                            {isFieldMapped(field.slug) && (
                                                <div className="text-green-500">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="border rounded-lg shadow-sm overflow-hidden bg-white">
                        <div className="p-4 border-b">
                            <h3 className="text-lg font-semibold">Blog Fields</h3>
                            <p className="text-sm text-gray-500">Drop source fields here to create mappings</p>
                        </div>

                        <div className="p-4">
                            <div className="space-y-4">
                                {blawgFields.map(field => (
                                    <div
                                        key={field.id}
                                        onDrop={(e) => handleDrop(e, field.id)}
                                        onDragOver={handleDragOver}
                                        className="p-4 border rounded-md"
                                    >
                                        <div className="font-medium">{field.name}</div>
                                        <div className="text-xs text-gray-500 mb-2">{field.description}</div>

                                        {mappings[field.id] ? (
                                            <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-md flex items-center justify-between">
                                                <div className="text-sm">
                                                    Mapped to: <span className="font-medium">{getWebflowFieldName(mappings[field.id])}</span>
                                                </div>
                                                <button
                                                    onClick={() => removeMapping(field.id)}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                    title="Remove mapping"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-400 italic">Drop a field here</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WebflowFieldMapper; 