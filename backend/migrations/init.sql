-- Support Ticket Analyst Database Schema
-- This migration creates all required tables for the application

-- Tickets table: Stores user-created support tickets
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Analysis runs table: Groups ticket analyses together with metadata
CREATE TABLE IF NOT EXISTS analysis_runs (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    summary TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'completed'
);

-- Ticket analysis table: Links tickets to analysis runs with extracted results
CREATE TABLE IF NOT EXISTS ticket_analysis (
    id SERIAL PRIMARY KEY,
    analysis_run_id INTEGER NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    priority VARCHAR(50) NOT NULL,
    notes TEXT,
    analysis TEXT,
    potential_causes TEXT,
    suggested_solutions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Ensure one analysis per ticket per run
    UNIQUE(analysis_run_id, ticket_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_created_at ON analysis_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_analysis_run_id ON ticket_analysis(analysis_run_id);
CREATE INDEX IF NOT EXISTS idx_ticket_analysis_ticket_id ON ticket_analysis(ticket_id);

