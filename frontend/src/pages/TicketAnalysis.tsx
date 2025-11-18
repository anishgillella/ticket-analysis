import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { RefreshCwIcon, SparklesIcon, PlusIcon, CheckCircleIcon, XIcon } from 'lucide-react';
import { api, TicketAnalysis as TicketAnalysisType, AnalysisRun, Ticket, TicketCreate, TicketUpdate } from '../services/api';
import AnalysisResults from '../components/AnalysisResults';
import DatabaseInspector from '../components/DatabaseInspector';

const TicketAnalysisPage = () => {
  const [activeTab, setActiveTab] = useState('tickets');
  const [latestAnalysis, setLatestAnalysis] = useState<{ analysis_run: AnalysisRun; ticket_analyses: TicketAnalysisType[] } | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisRun[]>([]);
  const [selectedHistoryRun, setSelectedHistoryRun] = useState<{ analysis_run: AnalysisRun; ticket_analyses: TicketAnalysisType[] } | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<number[]>([]);
  
  // Upload form state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('open');
  const [tags, setTags] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [editingTicketId, setEditingTicketId] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<Partial<Ticket> | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ticketsData, historyData] = await Promise.all([
        api.getTickets().catch(() => []),
        api.getAnalysisHistory().catch(() => ({ analysis_runs: [] })),
      ]);
      setTickets(ticketsData);
      setAnalysisHistory(historyData.analysis_runs);
      
      // Try to load latest analysis
      try {
        const latest = await api.getLatestAnalysis();
        setLatestAnalysis(latest);
      } catch {
        setLatestAnalysis(null);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoricalRun = async (runId: number) => {
    try {
      const analysis = await api.getAnalysisRun(runId);
      setSelectedHistoryRun(analysis);
    } catch (err) {
      console.error('Failed to load historical run:', err);
      alert('Failed to load analysis run details');
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
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
      setShowUploadForm(false);
      
      // Reload tickets
      await loadData();
      
      setTimeout(() => {
        setUploadStatus('idle');
      }, 2000);
    } catch (err) {
      console.error('Failed to create ticket:', err);
      setUploadStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create ticket');
    }
  };

  const handleToggleSelect = (ticketId: number) => {
    setSelectedTickets(prev =>
      prev.includes(ticketId)
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTickets.length === tickets.length) {
      setSelectedTickets([]);
    } else {
      setSelectedTickets(tickets.map(t => t.id));
    }
  };

  const handleAnalyze = async () => {
    if (tickets.length === 0) {
      alert('No tickets available to analyze. Create some tickets first!');
      return;
    }

    try {
      setAnalyzing(true);
      const ticketIds = selectedTickets.length > 0 ? selectedTickets : undefined;
      const result = await api.analyzeTickets(ticketIds);
      setLatestAnalysis(result);
      await loadData(); // Reload to get updated tickets and history
      setSelectedTickets([]);
      setActiveTab('results'); // Switch to results tab to show charts
    } catch (err) {
      console.error('Analysis failed:', err);
      alert(`Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // Prepare data for charts from analyzed tickets
  const categoryData = latestAnalysis
    ? latestAnalysis.ticket_analyses.reduce((acc, analysis) => {
        const cat = analysis.category.replace('_', ' ');
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    : {};

  const categoryChartData = Object.entries(categoryData).map(([name, count]) => ({
    name,
    count,
  }));

  // Priority distribution from analyzed tickets
  const priorityData = latestAnalysis
    ? latestAnalysis.ticket_analyses.reduce((acc, analysis) => {
        acc[analysis.priority] = (acc[analysis.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    : {};

  const priorityChartData = Object.entries(priorityData).map(([name, count]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    count,
  })).sort((a, b) => {
    const order: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
    return (order[b.name] || 0) - (order[a.name] || 0);
  });

  // Status distribution from analyzed tickets
  // Get status from ticket_analyses by looking up tickets
  const statusCounts: Record<string, number> = {};
  if (latestAnalysis && tickets.length > 0) {
    const analyzedTicketIds = new Set(latestAnalysis.ticket_analyses.map(a => a.ticket_id));
    const analyzedTickets = tickets.filter(t => analyzedTicketIds.has(t.id));
    
    analyzedTickets.forEach(ticket => {
      const status = ticket.status === 'in_progress' ? 'In Progress' : 
                     ticket.status === 'resolved' || ticket.status === 'closed' ? 'Resolved' : 
                     'Open';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
  }

  const statusChartData = Object.entries(statusCounts)
    .filter(([_, count]) => count > 0)
    .map(([name, value]) => ({
      name,
      value,
      color: name === 'Open' ? '#3B82F6' : name === 'In Progress' ? '#FBBF24' : '#10B981'
    }));

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
      case 'closed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEditTicket = (ticket: Ticket) => {
    setEditingTicketId(ticket.id);
    setEditingData({ ...ticket });
  };

  const handleSaveTicket = async (ticketId: number) => {
    if (!editingData) return;
    
    try {
      const updateData: TicketUpdate = {
        status: editingData.status,
        tags: editingData.tags,
      };
      
      await api.updateTicket(ticketId, updateData);
      setEditingTicketId(null);
      setEditingData(null);
      await loadData();
    } catch (err) {
      console.error('Failed to update ticket:', err);
      alert(`Failed to update ticket: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingTicketId(null);
    setEditingData(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Ticket Analysis</h1>
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0">
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            {showUploadForm ? 'Cancel' : 'Create Ticket'}
          </button>
          <button
            onClick={handleAnalyze}
            disabled={analyzing || tickets.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? (
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
                Analyzing...
              </>
            ) : (
              <>
                <SparklesIcon className="h-4 w-4 mr-2" />
                Analyze {selectedTickets.length > 0 ? `${selectedTickets.length} Selected` : `All (${tickets.length})`}
              </>
            )}
          </button>
          <button
            onClick={loadData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Ticket</h2>
            <form onSubmit={handleCreateTicket} className="space-y-4">
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
                  rows={4}
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
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={uploadStatus === 'uploading'}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {uploadStatus === 'uploading' ? 'Creating...' : 'Create Ticket'}
                </button>
                {uploadStatus === 'success' && (
                  <div className="flex items-center text-green-600 text-sm">
                    <CheckCircleIcon className="h-5 w-5 mr-1" />
                    Ticket created successfully!
                  </div>
                )}
                {uploadStatus === 'error' && (
                  <div className="flex items-center text-red-600 text-sm">
                    <XIcon className="h-5 w-5 mr-1" />
                    {errorMessage || 'Failed to create ticket'}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selection Info */}
      {selectedTickets.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-sm font-medium text-blue-800">
            {selectedTickets.length} ticket{selectedTickets.length !== 1 ? 's' : ''} selected
            <button
              onClick={() => setSelectedTickets([])}
              className="ml-2 text-blue-600 hover:text-blue-800 underline"
            >
              Clear selection
            </button>
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'tickets'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('tickets')}
            >
              Tickets ({tickets.length})
            </button>
            <button
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'results'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('results')}
            >
              Analysis Results
            </button>
            <button
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('history')}
            >
              History
            </button>
            <button
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'database'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('database')}
            >
              Database Inspector
            </button>
          </nav>
        </div>

        <div className="p-4 sm:p-6">
          {/* Tickets Tab */}
          {activeTab === 'tickets' && (
            <div className="space-y-4">
              {tickets.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No tickets yet. Create your first ticket above!</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Select Tickets to Analyze</h3>
                    <button
                      onClick={handleSelectAll}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      {selectedTickets.length === tickets.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {tickets.map((ticket) => {
                      const isSelected = selectedTickets.includes(ticket.id);
                      const isEditing = editingTicketId === ticket.id;
                      
                      return (
                        <div
                          key={ticket.id}
                          className={`border-2 rounded-lg p-4 transition-all ${
                            isSelected && !isEditing
                              ? 'border-indigo-500 bg-indigo-50'
                              : isEditing
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {isEditing && editingData ? (
                            // Edit mode
                            <div className="space-y-3">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold text-gray-900">#{ticket.id}: {ticket.title}</h4>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                                  <select
                                    value={editingData.status || 'open'}
                                    onChange={(e) => setEditingData({ ...editingData, status: e.target.value })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                                  >
                                    <option value="open">Open</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="closed">Closed</option>
                                  </select>
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Tags</label>
                                  <input
                                    type="text"
                                    value={editingData.tags || ''}
                                    onChange={(e) => setEditingData({ ...editingData, tags: e.target.value || null })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                                    placeholder="comma,separated,tags"
                                  />
                                </div>
                              </div>

                              <div className="flex gap-2 pt-2">
                                <button
                                  onClick={() => handleSaveTicket(ticket.id)}
                                  className="flex-1 px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="flex-1 px-3 py-1.5 bg-gray-300 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-400"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            // View mode
                            <div
                              onClick={() => handleToggleSelect(ticket.id)}
                              className="cursor-pointer"
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelect(ticket.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <div className="flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-gray-900">#{ticket.id}: {ticket.title}</h4>
                                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{ticket.description}</p>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                      <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(ticket.status)}`}>
                                        {ticket.status.replace('_', ' ')}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditTicket(ticket);
                                        }}
                                        className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  </div>
                                  {ticket.tags && (
                                    <p className="text-xs text-gray-500 mt-2">Tags: {ticket.tags}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Results Tab */}
          {activeTab === 'results' && (
            <div className="space-y-6">
              {!latestAnalysis ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No analysis results yet. Analyze tickets to see results here.</p>
                </div>
              ) : (
                <>
                  <AnalysisResults
                    analysis_run={latestAnalysis.analysis_run}
                    ticket_analyses={latestAnalysis.ticket_analyses}
                    onRefresh={() => {
                      setLatestAnalysis(null);
                      setActiveTab('tickets');
                    }}
                  />

                  {/* Charts Section */}
                  {latestAnalysis.ticket_analyses.length > 0 && (
                    <>
                      <div className="pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Charts</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Status Distribution */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Status Distribution</h3>
                          {statusChartData.length > 0 ? (
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={statusChartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }) =>
                                      `${name}: ${(percent * 100).toFixed(0)}%`
                                    }
                                  >
                                    {statusChartData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <div className="h-64 flex items-center justify-center text-gray-500">
                              <p className="text-sm">Loading status data...</p>
                            </div>
                          )}
                        </div>

                        {/* Category Distribution */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Category Distribution</h3>
                          {categoryChartData.length > 0 ? (
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={categoryChartData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="name" />
                                  <YAxis />
                                  <Tooltip />
                                  <Bar dataKey="count" fill="#6366F1" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <div className="h-64 flex items-center justify-center text-gray-500">
                              <p className="text-sm">No category data</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Priority Distribution */}
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Priority Distribution</h3>
                        {priorityChartData.length > 0 ? (
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={priorityChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar 
                                  dataKey="count" 
                                  fill="#10B981"
                                  radius={[8, 8, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="h-64 flex items-center justify-center text-gray-500">
                            <p className="text-sm">No priority data</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                </>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {selectedHistoryRun ? (
                <>
                  <button
                    onClick={() => setSelectedHistoryRun(null)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 mb-4"
                  >
                    ← Back to History
                  </button>
                  <AnalysisResults
                    analysis_run={selectedHistoryRun.analysis_run}
                    ticket_analyses={selectedHistoryRun.ticket_analyses}
                    onRefresh={() => setSelectedHistoryRun(null)}
                  />
                </>
              ) : analysisHistory.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No analysis history yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900">Analysis History</h2>
                  {analysisHistory.map((run) => (
                    <button
                    key={run.id}
                      onClick={() => loadHistoricalRun(run.id)}
                      className="w-full text-left border border-gray-200 rounded-lg p-4 hover:bg-indigo-50 hover:border-indigo-300 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-900">Run #{run.id}</span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              run.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {run.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{run.summary}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>{new Date(run.created_at).toLocaleString()}</span>
                          {run.total_tokens_used && (
                            <span>Tokens: {run.total_tokens_used.toLocaleString()}</span>
                          )}
                          {run.total_cost && (
                            <span>Cost: ${run.total_cost.toFixed(6)}</span>
                          )}
                        </div>
                      </div>
                        <div className="text-indigo-600 ml-4">→</div>
                    </div>
                    </button>
                  ))}
                  </div>
              )}
            </div>
          )}

          {/* Database Inspector Tab */}
          {activeTab === 'database' && (
            <DatabaseInspector />
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketAnalysisPage;
