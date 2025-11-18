import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TicketIcon, ClockIcon, CheckCircleIcon, TrendingUpIcon } from 'lucide-react';
import TicketList from '../components/TicketList';
import { api, Ticket, AnalysisRun, TicketAnalysis } from '../services/api';

interface SessionAnalysis {
  analysis_run: AnalysisRun;
  ticket_analyses: TicketAnalysis[];
  sessionRunNumber: number;
}

const Dashboard = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [analysisRuns, setAnalysisRuns] = useState<AnalysisRun[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; count: number }[]>([]);
  const [priorityData, setPriorityData] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateChartsFromSession = () => {
    const stored = localStorage.getItem('sessionAnalyses');
    if (stored) {
      try {
        const sessionAnalyses: SessionAnalysis[] = JSON.parse(stored);
        
        if (sessionAnalyses.length > 0) {
          // Calculate category distribution from ALL session analyses (cumulative)
          const categoryCounts: Record<string, number> = {};
          sessionAnalyses.forEach((sessionAnalysis) => {
            sessionAnalysis.ticket_analyses.forEach((analysis: TicketAnalysis) => {
              const cat = analysis.category.replace('_', ' ');
              categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            });
          });
          
          const categoryColors: Record<string, string> = {
            bug: '#EF4444',
            'feature request': '#3B82F6',
            billing: '#8B5CF6',
            question: '#F59E0B',
            support: '#10B981',
            other: '#6B7280'
          };
          
          setCategoryData(
            Object.entries(categoryCounts)
              .map(([name, count]) => ({ 
                name, 
                count,
                color: categoryColors[name.toLowerCase()] || '#6B7280'
              }))
              .sort((a, b) => b.count - a.count)
          );

          // Calculate priority distribution from ALL session analyses (cumulative)
          const priorityCounts: Record<string, number> = {};
          sessionAnalyses.forEach((sessionAnalysis) => {
            sessionAnalysis.ticket_analyses.forEach((analysis: TicketAnalysis) => {
              priorityCounts[analysis.priority] = (priorityCounts[analysis.priority] || 0) + 1;
            });
          });
          
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const priorityColors: Record<string, string> = {
            high: '#EF4444',
            medium: '#F59E0B',
            low: '#10B981'
          };
          
          setPriorityData(
            Object.entries(priorityCounts)
              .map(([name, count]) => ({ 
                name: name.charAt(0).toUpperCase() + name.slice(1), 
                count,
                color: priorityColors[name.toLowerCase()] || '#6B7280'
              }))
              .sort((a, b) => {
                return (priorityOrder[b.name.toLowerCase() as keyof typeof priorityOrder] || 0) - 
                       (priorityOrder[a.name.toLowerCase() as keyof typeof priorityOrder] || 0);
              })
          );
        } else {
          setCategoryData([]);
          setPriorityData([]);
        }
      } catch (e) {
        console.error('Failed to parse stored session analyses:', e);
      }
    } else {
      setCategoryData([]);
      setPriorityData([]);
    }
  };

  useEffect(() => {
    loadData();
    // Check for session analyses on mount and periodically
    updateChartsFromSession();
    const interval = setInterval(updateChartsFromSession, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ticketsData, historyData] = await Promise.all([
        api.getTickets().catch(() => []),
        api.getAnalysisHistory(100).catch(() => ({ analysis_runs: [] })),
      ]);
      setTickets(ticketsData);
      setAnalysisRuns(historyData.analysis_runs);
      
      // Update charts from session analyses
      updateChartsFromSession();
      
      setError(null);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats from real data
  const openTickets = tickets.filter(t => t.status === 'open').length;
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
  const totalTickets = tickets.length;

  const statusData = [
    { name: 'Open', value: openTickets, color: '#3B82F6' },
    { name: 'In Progress', value: inProgressTickets, color: '#FBBF24' },
    { name: 'Resolved', value: resolvedTickets, color: '#10B981' },
  ].filter(item => item.value > 0);

  const stats = [
    {
      id: 1,
      name: 'Total Tickets',
      stat: totalTickets.toString(),
      icon: <TicketIcon className="h-6 w-6 text-indigo-500" />,
    },
    {
      id: 2,
      name: 'Open Tickets',
      stat: openTickets.toString(),
      icon: <div className="h-6 w-6 text-blue-500" />,
    },
    {
      id: 3,
      name: 'In Progress',
      stat: inProgressTickets.toString(),
      icon: <ClockIcon className="h-6 w-6 text-amber-500" />,
    },
    {
      id: 4,
      name: 'Resolved',
      stat: resolvedTickets.toString(),
      icon: <CheckCircleIcon className="h-6 w-6 text-green-500" />,
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="text-gray-600 text-sm">Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <button
          onClick={loadData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div key={item.id} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">{item.icon}</div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {item.name}
                    </dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">
                        {item.stat}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* All 3 Charts - Cumulative across all runs */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Analysis Charts (Cumulative)</h2>
        <p className="text-sm text-gray-600">Showing data from all analysis runs in this session</p>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Status Distribution */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Ticket Status Distribution
              </h2>
            </div>
            {statusData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
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
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <p className="text-sm">No tickets yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Ticket Categories
              </h2>
            </div>
            {categoryData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="count" barSize={30} radius={[4, 4, 0, 0]}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#6366F1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <p className="text-sm">Run an analysis to see category distribution</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Priority Distribution - Full width */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              Priority Distribution
            </h2>
          </div>
          {priorityData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={priorityData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Bar 
                    dataKey="count" 
                    barSize={30}
                    radius={[4, 4, 0, 0]}
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#6B7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <p className="text-sm">Run an analysis to see priority distribution</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-5 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Recent Tickets</h2>
            <a
              href="/analysis"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              View all
            </a>
          </div>
        </div>
        <TicketList limit={5} />
      </div>

      {/* Latest Analysis */}
      {analysisRuns.length > 0 && (
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Latest Analysis</h2>
              <div className="flex items-center space-x-2">
                <TrendingUpIcon className="h-5 w-5 text-indigo-500" />
                <span className="text-sm text-gray-500">
                  Run #{analysisRuns[0].id}
                </span>
              </div>
            </div>
            <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
              <p className="text-sm text-indigo-800">{analysisRuns[0].summary}</p>
              {analysisRuns[0].total_cost && (
                <p className="text-xs text-indigo-600 mt-2">
                  Cost: ${analysisRuns[0].total_cost.toFixed(6)} | Tokens: {analysisRuns[0].total_tokens_used?.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
