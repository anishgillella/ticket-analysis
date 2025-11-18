"""Database service layer for agent operations."""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models import Ticket, AnalysisRun, TicketAnalysis
from app.schemas import TicketAnalysisOutput


def get_tickets_by_ids(db: Session, ticket_ids: List[int]) -> List[Ticket]:
    """Fetch tickets by their IDs."""
    stmt = select(Ticket).where(Ticket.id.in_(ticket_ids))
    result = db.execute(stmt)
    return list(result.scalars().all())


def get_all_tickets(db: Session) -> List[Ticket]:
    """Fetch all tickets."""
    stmt = select(Ticket)
    result = db.execute(stmt)
    return list(result.scalars().all())


def create_analysis_run(db: Session, summary: str = "") -> AnalysisRun:
    """Create a new analysis run."""
    analysis_run = AnalysisRun(
        summary=summary,
        status="in_progress"
    )
    db.add(analysis_run)
    db.commit()
    db.refresh(analysis_run)
    return analysis_run


def update_analysis_run(
    db: Session,
    run_id: int,
    summary: str,
    status: str = "completed"
) -> AnalysisRun:
    """Update an analysis run with results."""
    stmt = select(AnalysisRun).where(AnalysisRun.id == run_id)
    result = db.execute(stmt)
    analysis_run = result.scalar_one_or_none()
    
    if not analysis_run:
        raise ValueError(f"Analysis run {run_id} not found")
    
    analysis_run.summary = summary
    analysis_run.status = status
    
    db.commit()
    db.refresh(analysis_run)
    return analysis_run


def save_ticket_analyses(
    db: Session,
    run_id: int,
    analyses: List[dict]
) -> List[TicketAnalysis]:
    """Save ticket analysis results to database."""
    import json
    ticket_analyses = []
    
    for analysis in analyses:
        # Convert lists to JSON strings for storage
        potential_causes_json = json.dumps(analysis.get("potential_causes", []))
        suggested_solutions_json = json.dumps(analysis.get("suggested_solutions", []))
        
        ticket_analysis = TicketAnalysis(
            analysis_run_id=run_id,
            ticket_id=analysis["ticket_id"],
            category=analysis["category"],
            priority=analysis["priority"],
            notes=analysis.get("notes"),
            analysis=analysis.get("analysis"),
            potential_causes=potential_causes_json,
            suggested_solutions=suggested_solutions_json
        )
        db.add(ticket_analysis)
        ticket_analyses.append(ticket_analysis)
    
    db.commit()
    
    # Refresh all objects
    for ta in ticket_analyses:
        db.refresh(ta)
    
    return ticket_analyses

