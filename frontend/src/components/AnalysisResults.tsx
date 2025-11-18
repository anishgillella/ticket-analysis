import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { AnalysisRun, TicketAnalysis as TicketAnalysisType } from '../services/api';

interface AnalysisResultsProps {
  analysis_run: AnalysisRun;
  ticket_analyses: TicketAnalysisType[];
  onRefresh: () => void;
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  analysis_run,
  ticket_analyses,
  onRefresh
}) => {
  const [expandedTicket, setExpandedTicket] = useState<number | null>(null);

  // Parse summary to extract metrics
  const summaryMatch = analysis_run.summary.match(
    /Analyzed (\d+)/
  );
  const ticketCount = summaryMatch ? parseInt(summaryMatch[1]) : ticket_analyses.length;

  // Extract category and priority info from analyses
  const categories: Record<string, number> = {};
  const priorities: Record<string, number> = {};

  ticket_analyses.forEach((analysis) => {
    categories[analysis.category] = (categories[analysis.category] || 0) + 1;
    priorities[analysis.priority] = (priorities[analysis.priority] || 0) + 1;
  });

  const highPriorityCount = priorities['high'] || 0;

  const handleRefresh = () => {
    onRefresh();
  };

  // Extract insights from summary (without numeric stats that appear in cards)
  const extractInsights = () => {
    const summary = analysis_run.summary || "";
    // Remove numeric metrics to avoid redundancy
    const lines = summary.split(". ");
    const insights: string[] = [];
    
    for (const line of lines) {
      // Skip lines that are purely numeric/metrics
      if (
        !line.includes("Analyzed") &&
        !line.includes("Categories:") &&
        !line.includes("Priority breakdown:") &&
        !line.includes("high-priority") &&
        line.trim()
      ) {
        insights.push(line.trim());
      }
    }
    
    return insights;
  };

  const insights = extractInsights();

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Analysis Results - Run #{analysis_run.id}</h2>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <span>↻</span> Refresh
        </button>
      </div>

      {/* Full Summary Card - Complete text */}
      <div className="bg-white border border-gray-300 rounded-lg p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Analysis Summary</h3>
        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{analysis_run.summary}</p>
      </div>

      {/* Summary Insights Card - Only non-redundant info */}
      {insights.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-amber-900 mb-2">💡 Key Insights</h3>
          <div className="space-y-2">
            {insights.map((insight, idx) => (
              <p key={idx} className="text-amber-800 text-sm leading-relaxed">
                • {insight}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Summary Metrics in Cards - ALWAYS VISIBLE */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Total Tickets Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-6 shadow-md">
            <div className="text-blue-600 text-sm font-semibold uppercase tracking-wide mb-2">Total Tickets</div>
            <div className="text-4xl font-bold text-blue-900">{ticketCount}</div>
            <div className="text-xs text-blue-600 mt-2">Analyzed in this run</div>
          </div>

          {/* Categories Card */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-6 shadow-md">
            <div className="text-gray-700 text-sm font-semibold uppercase tracking-wide mb-3">Categories</div>
            <div className="space-y-2">
              {Object.keys(categories).length > 0 ? (
                Object.entries(categories).map(([cat, count]) => {
                  const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
                    bug: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-300' },
                    'feature request': { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300' },
                    billing: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300' },
                    question: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
                    support: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-300' }
                  };
                  const colors = categoryColors[cat.toLowerCase()] || { bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-300' };
                  return (
                    <div key={cat} className={`flex justify-between items-center px-3 py-2 rounded border ${colors.bg} ${colors.border}`}>
                      <span className={`${colors.text} capitalize font-medium`}>{cat.replace('_', ' ')}</span>
                      <span className={`${colors.text} font-bold`}>{count}</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-gray-600">No categories</div>
              )}
            </div>
          </div>

          {/* Priority Breakdown Card */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-6 shadow-md">
            <div className="text-gray-700 text-sm font-semibold uppercase tracking-wide mb-3">Priority</div>
            <div className="space-y-2">
              {Object.keys(priorities).length > 0 ? (
                ['high', 'medium', 'low'].map((priority) => {
                  const count = priorities[priority] || 0;
                  if (count === 0) return null;
                  const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
                    high: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-300' },
                    medium: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
                    low: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-300' }
                  };
                  const colors = priorityColors[priority] || { bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-300' };
                  return (
                    <div key={priority} className={`flex justify-between items-center px-3 py-2 rounded border ${colors.bg} ${colors.border}`}>
                      <span className={`${colors.text} capitalize font-medium`}>{priority}</span>
                      <span className={`${colors.text} font-bold`}>{count}</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-gray-600">No priorities</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analysis Section */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Detailed Analysis</h3>
        <p className="text-sm text-gray-600 mb-4">
          {ticket_analyses.length} ticket{ticket_analyses.length !== 1 ? 's' : ''} analyzed • Scroll to see more
        </p>

        {/* Scrollable Container */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {ticket_analyses.map((analysis) => (
              <div
                key={analysis.id}
                className="flex-shrink-0 w-96 bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-500">Ticket #{analysis.ticket_id}</span>
                    <span className="text-xs text-gray-400">Run #{analysis.analysis_run_id}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(() => {
                      const categoryColors: Record<string, string> = {
                        bug: 'bg-red-100 text-red-800',
                        'feature request': 'bg-blue-100 text-blue-800',
                        billing: 'bg-purple-100 text-purple-800',
                        question: 'bg-amber-100 text-amber-800',
                        support: 'bg-green-100 text-green-800'
                      };
                      const catColor = categoryColors[analysis.category.toLowerCase()] || 'bg-gray-100 text-gray-800';
                      return (
                        <span className={`inline-block px-2 py-1 ${catColor} rounded text-xs font-semibold`}>
                          {analysis.category.replace('_', ' ')}
                        </span>
                      );
                    })()}
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        analysis.priority === 'high'
                          ? 'bg-red-100 text-red-800'
                          : analysis.priority === 'medium'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {analysis.priority}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="px-6 py-4 max-h-96 overflow-y-auto space-y-4">
                  {/* Analysis - Agent Generated */}
                  {analysis.analysis && (
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm mb-2">Analysis</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">{analysis.analysis}</p>
                    </div>
                  )}

                  {/* Legacy notes field - fallback if analysis not available */}
                  {!analysis.analysis && analysis.notes && (
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm mb-2">Notes</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">{analysis.notes}</p>
                    </div>
                  )}

                  {/* Potential Causes - Agent Generated */}
                  {analysis.potential_causes && (
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm mb-2">Potential Causes</h4>
                      <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                        {(() => {
                          try {
                            const causes = typeof analysis.potential_causes === 'string' 
                              ? JSON.parse(analysis.potential_causes)
                              : analysis.potential_causes;
                            if (Array.isArray(causes)) {
                              return causes.map((cause: string, idx: number) => (
                                <li key={idx}>{cause}</li>
                              ));
                            }
                            return <li>{String(causes)}</li>;
                          } catch (e) {
                            return <li>{String(analysis.potential_causes)}</li>;
                          }
                        })()}
                      </ul>
                    </div>
                  )}

                  {/* Suggested Solutions - Agent Generated */}
                  {analysis.suggested_solutions && (
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm mb-2">Suggested Solutions</h4>
                      <ol className="text-sm text-gray-700 list-decimal list-inside space-y-1">
                        {(() => {
                          try {
                            const solutions = typeof analysis.suggested_solutions === 'string' 
                              ? JSON.parse(analysis.suggested_solutions)
                              : analysis.suggested_solutions;
                            if (Array.isArray(solutions)) {
                              return solutions.map((solution: string, idx: number) => (
                                <li key={idx}>{solution}</li>
                              ));
                            }
                            return <li>{String(solutions)}</li>;
                          } catch (e) {
                            return <li>{String(analysis.suggested_solutions)}</li>;
                          }
                        })()}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default AnalysisResults;

