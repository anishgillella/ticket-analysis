import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '../services/api';

type TableName = 'tickets' | 'analysis_runs' | 'ticket_analyses';

const DatabaseInspector = () => {
  const [selectedTable, setSelectedTable] = useState<TableName>('tickets');
  const [data, setData] = useState<{
    tickets: any[];
    analysis_runs: any[];
    ticket_analyses: any[];
    counts: { tickets: number; analysis_runs: number; ticket_analyses: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getDatabaseView();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load database');
      console.error('Failed to load database view:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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

  if (!data) {
    return <div className="text-center text-gray-500">No data available</div>;
  }

  const getTableData = () => {
    switch (selectedTable) {
      case 'tickets':
        return { rows: data.tickets, count: data.counts.tickets };
      case 'analysis_runs':
        return { rows: data.analysis_runs, count: data.counts.analysis_runs };
      case 'ticket_analyses':
        return { rows: data.ticket_analyses, count: data.counts.ticket_analyses };
    }
  };

  const { rows, count } = getTableData();

  const getColumns = (): string[] => {
    if (rows.length === 0) return [];
    return Object.keys(rows[0]);
  };

  const columns = getColumns();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Database Inspector</h2>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw size={18} /> Refresh
        </button>
      </div>

      {/* Table Selector Dropdown */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Select Table:</label>
        <select
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value as TableName)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="tickets">Tickets ({data.counts.tickets})</option>
          <option value="analysis_runs">Analysis Runs ({data.counts.analysis_runs})</option>
          <option value="ticket_analyses">Ticket Analyses ({data.counts.ticket_analyses})</option>
        </select>
      </div>

      {/* Table Stats */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          Showing <span className="font-semibold">{count}</span> record{count !== 1 ? 's' : ''} from <span className="font-semibold">{selectedTable.replace('_', ' ')}</span> table
        </p>
      </div>

      {/* Table Display */}
      {rows.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No records in {selectedTable} table</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full">
            {/* Header */}
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                  >
                    {col.replace('_', ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            {/* Body */}
            <tbody className="divide-y divide-gray-200 bg-white">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  {columns.map((col) => {
                    let value = row[col];
                    
                    // Format timestamp
                    if (col.includes('_at') && value) {
                      value = new Date(value).toLocaleString();
                    }
                    
                    // Format cost
                    if (col === 'total_cost' && value) {
                      value = `$${parseFloat(value).toFixed(6)}`;
                    }
                    
                    // Format confidence
                    if (col === 'confidence_score' && value) {
                      value = `${(value * 100).toFixed(1)}%`;
                    }
                    
                    // Truncate long text
                    let displayValue = String(value || '');
                    if (displayValue.length > 100) {
                      displayValue = displayValue.substring(0, 100) + '...';
                    }
                    
                    return (
                      <td
                        key={`${idx}-${col}`}
                        className="px-6 py-4 text-sm text-gray-700 max-w-md"
                        title={String(row[col] || '')}
                      >
                        {displayValue || <span className="text-gray-400">null</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
        <p>
          💡 <strong>Tables:</strong> tickets (input), analysis_runs (metadata), ticket_analyses (results)
        </p>
      </div>
    </div>
  );
};

export default DatabaseInspector;

