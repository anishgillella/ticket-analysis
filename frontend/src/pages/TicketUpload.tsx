import React, { useState } from 'react';
import { UploadIcon, FileTextIcon, AlertCircleIcon, CheckCircleIcon, XIcon } from 'lucide-react';
import { api, TicketCreate } from '../services/api';
import { useNavigate } from 'react-router-dom';

const TicketUpload = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('open');
  const [tags, setTags] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      setErrorMessage('Title and description are required');
      setUploadStatus('error');
      return;
    }

    try {
      setUploadStatus('uploading');
      setErrorMessage('');
      
      const ticketData: TicketCreate = {
        title: title.trim(),
        description: description.trim(),
        status,
        tags: tags.trim() || null,
      };

      await api.createTickets([ticketData]);
      
      setUploadStatus('success');
      setTitle('');
      setDescription('');
      setStatus('open');
      setTags('');
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/');
    }, 2000);
    } catch (err) {
      console.error('Failed to create ticket:', err);
      setUploadStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create ticket');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Create Support Ticket
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Create a new support ticket for analysis
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Cannot login to account"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Describe the issue in detail..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                      Tags
                    </label>
                    <input
                      type="text"
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., bug, urgent"
                    />
                    <p className="mt-1 text-xs text-gray-500">Comma-separated tags</p>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={uploadStatus === 'uploading'}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {uploadStatus === 'uploading' ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                          </svg>
                        Creating...
                      </>
                    ) : (
                      'Create Ticket'
                    )}
                    </button>
                  </div>

                {uploadStatus === 'success' && (
                  <div className="bg-green-50 p-4 rounded-md">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <CheckCircleIcon className="h-5 w-5 text-green-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-green-800">
                          Ticket created successfully! Redirecting...
                          </p>
                        </div>
                      </div>
                  </div>
                )}

                {uploadStatus === 'error' && (
                  <div className="bg-red-50 p-4 rounded-md">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <XIcon className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-red-800">
                          {errorMessage || 'There was an error creating your ticket. Please try again.'}
                          </p>
                        </div>
                      </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900">AI Analysis</h2>
              <p className="mt-1 text-sm text-gray-500">
                After creating tickets, use the Analysis page to analyze them with AI.
              </p>
              <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                <div className="flex items-start">
                  <AlertCircleIcon className="h-5 w-5 text-indigo-600 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-indigo-800">
                      AI-Powered Analysis
                    </h3>
                    <p className="mt-1 text-sm text-indigo-700">
                      Go to the Analysis page to analyze your tickets with LangGraph and GPT-5-Mini.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketUpload;
