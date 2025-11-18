-- Add additional ticket attributes
-- Status: open, in_progress, resolved, closed
-- Tags: comma-separated tags for categorization
-- Updated_at: track when ticket was last modified

ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'open',
ADD COLUMN IF NOT EXISTS tags TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- Update updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

