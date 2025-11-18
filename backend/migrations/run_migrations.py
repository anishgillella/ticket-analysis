"""Script to run database migrations using SQLAlchemy models."""

import os
import sys
from pathlib import Path

# Add backend/app to path so we can import models
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from app.database import engine, Base
from app.models import Ticket, AnalysisRun, TicketAnalysis
import psycopg2

def run_migrations():
    """Create all tables using SQLAlchemy models."""
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/ticket_analysis")
    
    # Parse connection string to create database if needed
    try:
        conn_str = database_url.replace("postgresql://", "")
        
        if "@" in conn_str:
            auth, rest = conn_str.split("@", 1)
            user, password = auth.split(":", 1)
        else:
            user = "postgres"
            password = "postgres"
            rest = conn_str
        
        if "/" in rest:
            host_port, database = rest.split("/", 1)
        else:
            host_port = rest
            database = "ticket_analysis"
        
        if ":" in host_port:
            host, port = host_port.split(":", 1)
        else:
            host = host_port
            port = "5432"
        
        print(f"📊 Connecting to database: {host}:{port}/{database}")
        
        # Create database if it doesn't exist
        try:
            conn = psycopg2.connect(
                host=host,
                port=port,
                database="postgres",
                user=user,
                password=password
            )
            conn.autocommit = True
            cursor = conn.cursor()
            
            cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (database,))
            if not cursor.fetchone():
                print(f"📦 Creating database '{database}'...")
                cursor.execute(f'CREATE DATABASE "{database}"')
                print(f"✅ Database '{database}' created")
            
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"⚠️  Could not check/create database: {e}")
        
        # Use SQLAlchemy to create all tables from models
        print("🔨 Creating tables from SQLAlchemy models...")
        Base.metadata.create_all(bind=engine)
        print("✅ All tables created successfully")
        
        # Verify tables
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"✅ Created tables: {tables}")
        
    except Exception as e:
        print(f"❌ Migration error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    run_migrations()
