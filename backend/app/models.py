"""SQLAlchemy ORM models for database tables."""

from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class Ticket(Base):
    """Support ticket model."""
    
    __tablename__ = "tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), default="open", nullable=False)  # open, in_progress, resolved, closed
    tags = Column(Text, nullable=True)  # Comma-separated tags
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationship to ticket analyses
    analyses = relationship("TicketAnalysis", back_populates="ticket")


class AnalysisRun(Base):
    """Analysis run model - groups ticket analyses together."""
    
    __tablename__ = "analysis_runs"
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    summary = Column(Text, nullable=False)
    status = Column(String(50), default="completed")
    
    # Relationship to ticket analyses
    ticket_analyses = relationship("TicketAnalysis", back_populates="analysis_run")


class TicketAnalysis(Base):
    """Ticket analysis model - links tickets to analysis runs with results."""
    
    __tablename__ = "ticket_analysis"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_run_id = Column(Integer, ForeignKey("analysis_runs.id"), nullable=False)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    category = Column(String(100), nullable=False)
    priority = Column(String(50), nullable=False)
    notes = Column(Text, nullable=True)  # Legacy field, keeping for backward compatibility
    analysis = Column(Text, nullable=True)  # Brief explanation of the issue
    potential_causes = Column(Text, nullable=True)  # JSON array stored as text
    suggested_solutions = Column(Text, nullable=True)  # JSON array stored as text
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    analysis_run = relationship("AnalysisRun", back_populates="ticket_analyses")
    ticket = relationship("Ticket", back_populates="analyses")

