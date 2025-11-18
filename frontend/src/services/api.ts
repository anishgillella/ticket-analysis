const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  tags?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketCreate {
  title: string;
  description: string;
  status?: string;
  tags?: string | null;
}

export interface TicketUpdate {
  title?: string;
  description?: string;
  status?: string;
  tags?: string | null;
}

export interface TicketAnalysis {
  id: number;
  analysis_run_id: number;
  ticket_id: number;
  category: string;
  priority: string;
  notes?: string | null;
  analysis?: string | null;
  potential_causes?: string | null;
  suggested_solutions?: string | null;
  created_at: string;
}

export interface AnalysisRun {
  id: number;
  created_at: string;
  summary: string;
  total_tokens_used?: number | null;
  total_cost?: number | null;
  status: string;
}

export interface AnalyzeResponse {
  analysis_run: AnalysisRun;
  ticket_analyses: TicketAnalysis[];
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries: number = 3
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ 
          error: { message: response.statusText } 
        }));
        throw new Error(error.error?.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Retry on network errors or 503 (service unavailable)
        if (attempt < retries - 1 && (error instanceof TypeError || (error instanceof Error && error.message.includes('503')))) {
          console.warn(`API request failed (attempt ${attempt + 1}/${retries}), retrying: ${endpoint}`);
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1))); // Exponential backoff
        } else {
          break;
        }
      }
    }
    
    console.error(`API request failed after ${retries} attempts: ${endpoint}`, lastError);
    throw lastError || new Error('Unknown error');
  }

  // Tickets
  async getTickets(): Promise<Ticket[]> {
    return this.request<Ticket[]>('/api/tickets');
  }

  async createTickets(tickets: TicketCreate[]): Promise<Ticket[]> {
    return this.request<Ticket[]>('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(tickets),
    });
  }

  async updateTicket(ticketId: number, ticketUpdate: TicketUpdate): Promise<Ticket> {
    return this.request<Ticket>(`/api/tickets/${ticketId}`, {
      method: 'PUT',
      body: JSON.stringify(ticketUpdate),
    });
  }

  // Analysis
  async analyzeTickets(ticketIds?: number[]): Promise<AnalyzeResponse> {
    return this.request<AnalyzeResponse>('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ ticket_ids: ticketIds || null }),
    });
  }

  async getLatestAnalysis(): Promise<AnalyzeResponse> {
    return this.request<AnalyzeResponse>('/api/analysis/latest');
  }

  async getAnalysisRun(runId: number): Promise<AnalyzeResponse> {
    return this.request<AnalyzeResponse>(`/api/analysis/runs/${runId}`);
  }

  async getAnalysisHistory(limit: number = 10, offset: number = 0): Promise<{ analysis_runs: AnalysisRun[] }> {
    return this.request<{ analysis_runs: AnalysisRun[] }>(
      `/api/analysis/runs?limit=${limit}&offset=${offset}`
    );
  }

  // Database view
  async getDatabaseView(): Promise<{
    tickets: Ticket[];
    analysis_runs: AnalysisRun[];
    ticket_analyses: TicketAnalysis[];
    counts: {
      tickets: number;
      analysis_runs: number;
      ticket_analyses: number;
    };
  }> {
    return this.request<{
      tickets: Ticket[];
      analysis_runs: AnalysisRun[];
      ticket_analyses: TicketAnalysis[];
      counts: {
        tickets: number;
        analysis_runs: number;
        ticket_analyses: number;
      };
    }>('/api/db/view');
  }
}

export const api = new ApiService();

