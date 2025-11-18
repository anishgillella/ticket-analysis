"""API route handlers."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.database import get_db
from app.models import Ticket, AnalysisRun, TicketAnalysis
from app.schemas import (
    TicketCreate,
    TicketUpdate,
    TicketResponse,
    AnalyzeRequest,
    AnalyzeResponse,
    AnalysisRunResponse,
    TicketAnalysisResponse,
    AnalysisHistoryResponse
)
from app.agent.graph import run_analysis
from app.api.exceptions import (
    ValidationError,
    NotFoundError,
    DatabaseError,
    LLMError,
    GraphExecutionError
)
from app.config import settings

router = APIRouter(prefix="/api", tags=["api"])


@router.post("/tickets", response_model=List[TicketResponse], status_code=status.HTTP_201_CREATED)
async def create_tickets(
    tickets: List[TicketCreate],
    db: Session = Depends(get_db)
) -> List[TicketResponse]:
    """
    Create one or more support tickets.
    
    Args:
        tickets: List of tickets to create
        db: Database session
    
    Returns:
        List of created tickets with IDs
    """
    if not tickets:
        raise ValidationError("At least one ticket is required")
    
    try:
        created_tickets = []
        for ticket_data in tickets:
            ticket = Ticket(
                title=ticket_data.title,
                description=ticket_data.description,
                status=ticket_data.status or "open",
                tags=ticket_data.tags
            )
            db.add(ticket)
            created_tickets.append(ticket)
        
        db.commit()
        
        # Refresh all tickets
        for ticket in created_tickets:
            db.refresh(ticket)
        
        return [TicketResponse.model_validate(ticket) for ticket in created_tickets]
    
    except Exception as e:
        db.rollback()
        raise DatabaseError(f"Failed to create tickets: {str(e)}")


@router.post("/analyze", response_model=AnalyzeResponse, status_code=status.HTTP_200_OK)
async def analyze_tickets(
    request: AnalyzeRequest,
    db: Session = Depends(get_db)
) -> AnalyzeResponse:
    """
    Analyze tickets using LangGraph agent.
    
    Args:
        request: Analysis request with optional ticket IDs
        db: Database session
    
    Returns:
        Analysis run with ticket analyses
    """
    # Check if OpenRouter API key is configured
    if not settings.openrouter_api_key:
        raise LLMError(
            "OpenRouter API key not configured",
            "Set OPENROUTER_API_KEY in environment variables"
        )
    
    ticket_ids = request.ticket_ids if request.ticket_ids else None
    
    try:
        # Run LangGraph agent
        result = run_analysis(
            ticket_ids=ticket_ids,
            db=db,
            langfuse_handler=None
        )
        
        # Fetch the analysis run
        stmt = select(AnalysisRun).where(AnalysisRun.id == result["run_id"])
        analysis_run_result = db.execute(stmt)
        analysis_run = analysis_run_result.scalar_one_or_none()
        
        if not analysis_run:
            raise NotFoundError(f"Analysis run {result['run_id']} not found")
        
        # Fetch ticket analyses
        stmt = select(TicketAnalysis).where(
            TicketAnalysis.analysis_run_id == result["run_id"]
        ).order_by(TicketAnalysis.id)
        analyses_result = db.execute(stmt)
        ticket_analyses = list(analyses_result.scalars().all())
        
        return AnalyzeResponse(
            analysis_run=AnalysisRunResponse.model_validate(analysis_run),
            ticket_analyses=[TicketAnalysisResponse.model_validate(ta) for ta in ticket_analyses]
        )
    
    except (ValidationError, NotFoundError, LLMError, GraphExecutionError):
        # Re-raise our custom exceptions
        raise
    except Exception as e:
        raise GraphExecutionError(
            f"Failed to execute analysis: {str(e)}",
            str(e)
        )


@router.get("/analysis/runs/{run_id}", response_model=AnalyzeResponse, status_code=status.HTTP_200_OK)
async def get_analysis_run(
    run_id: int,
    db: Session = Depends(get_db)
) -> AnalyzeResponse:
    """
    Get a specific analysis run with all its ticket analyses.
    
    Args:
        run_id: Analysis run ID
        db: Database session
    
    Returns:
        Analysis run with ticket analyses
    """
    try:
        # Get the analysis run
        stmt = select(AnalysisRun).where(AnalysisRun.id == run_id)
        result = db.execute(stmt)
        analysis_run = result.scalar_one_or_none()
        
        if not analysis_run:
            raise NotFoundError(f"Analysis run {run_id} not found")
        
        # Get ticket analyses for this run
        stmt = select(TicketAnalysis).where(
            TicketAnalysis.analysis_run_id == run_id
        ).order_by(TicketAnalysis.id)
        analyses_result = db.execute(stmt)
        ticket_analyses = list(analyses_result.scalars().all())
        
        return AnalyzeResponse(
            analysis_run=AnalysisRunResponse.model_validate(analysis_run),
            ticket_analyses=[TicketAnalysisResponse.model_validate(ta) for ta in ticket_analyses]
        )
    
    except NotFoundError:
        raise
    except Exception as e:
        raise DatabaseError(f"Failed to fetch analysis run {run_id}: {str(e)}")


@router.get("/analysis/latest", response_model=AnalyzeResponse, status_code=status.HTTP_200_OK)
async def get_latest_analysis(
    db: Session = Depends(get_db)
) -> AnalyzeResponse:
    """
    Get the latest analysis run with all ticket analyses.
    
    Args:
        db: Database session
    
    Returns:
        Latest analysis run with ticket analyses
    """
    # Get latest analysis run
    stmt = select(AnalysisRun).order_by(desc(AnalysisRun.created_at)).limit(1)
    result = db.execute(stmt)
    analysis_run = result.scalar_one_or_none()
    
    if not analysis_run:
        raise NotFoundError(
            "No analyses found",
            "Run /api/analyze to create an analysis first"
        )
    
    # Get ticket analyses for this run
    stmt = select(TicketAnalysis).where(
        TicketAnalysis.analysis_run_id == analysis_run.id
    ).order_by(TicketAnalysis.id)
    analyses_result = db.execute(stmt)
    ticket_analyses = list(analyses_result.scalars().all())
    
    return AnalyzeResponse(
        analysis_run=AnalysisRunResponse.model_validate(analysis_run),
        ticket_analyses=[TicketAnalysisResponse.model_validate(ta) for ta in ticket_analyses]
    )


@router.get("/analysis/runs", response_model=AnalysisHistoryResponse, status_code=status.HTTP_200_OK)
async def get_analysis_history(
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_db)
) -> AnalysisHistoryResponse:
    """
    Get all analysis runs (history).
    
    Args:
        limit: Maximum number of runs to return (default: 10)
        offset: Number of runs to skip (default: 0)
        db: Database session
    
    Returns:
        List of analysis runs
    """
    if limit < 1 or limit > 100:
        raise ValidationError("Limit must be between 1 and 100")
    
    if offset < 0:
        raise ValidationError("Offset must be >= 0")
    
    try:
        stmt = select(AnalysisRun).order_by(desc(AnalysisRun.created_at)).limit(limit).offset(offset)
        result = db.execute(stmt)
        analysis_runs = list(result.scalars().all())
        
        return AnalysisHistoryResponse(
            analysis_runs=[AnalysisRunResponse.model_validate(ar) for ar in analysis_runs]
        )
    
    except Exception as e:
        raise DatabaseError(f"Failed to fetch analysis history: {str(e)}")


@router.get("/tickets", response_model=List[TicketResponse], status_code=status.HTTP_200_OK)
async def list_tickets(
    db: Session = Depends(get_db)
) -> List[TicketResponse]:
    """
    List all tickets.
    
    Args:
        db: Database session
    
    Returns:
        List of all tickets
    """
    try:
        stmt = select(Ticket).order_by(desc(Ticket.created_at))
        result = db.execute(stmt)
        tickets = list(result.scalars().all())
        
        return [TicketResponse.model_validate(ticket) for ticket in tickets]
    
    except Exception as e:
        raise DatabaseError(f"Failed to fetch tickets: {str(e)}")


@router.put("/tickets/{ticket_id}", response_model=TicketResponse, status_code=status.HTTP_200_OK)
async def update_ticket(
    ticket_id: int,
    ticket_update: TicketUpdate,
    db: Session = Depends(get_db)
) -> TicketResponse:
    """
    Update a support ticket.
    
    Args:
        ticket_id: ID of ticket to update
        ticket_update: Fields to update
        db: Database session
    
    Returns:
        Updated ticket
    """
    try:
        stmt = select(Ticket).where(Ticket.id == ticket_id)
        result = db.execute(stmt)
        ticket = result.scalar_one_or_none()
        
        if not ticket:
            raise NotFoundError(f"Ticket {ticket_id} not found")
        
        # Update only provided fields
        update_data = ticket_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(ticket, field, value)
        
        db.commit()
        db.refresh(ticket)
        
        return TicketResponse.model_validate(ticket)
    
    except NotFoundError:
        raise
    except Exception as e:
        db.rollback()
        raise DatabaseError(f"Failed to update ticket: {str(e)}")


@router.get("/analysis/tickets-summary", status_code=status.HTTP_200_OK)
async def get_tickets_summary(
    db: Session = Depends(get_db)
) -> dict:
    """
    Get summary of all tickets analyzed (category and priority distribution).
    Returns analysis of the latest run grouped by category and priority.
    
    Returns:
        Dictionary with category_data and priority_data for charts
    """
    try:
        # Get latest analysis run
        stmt = select(AnalysisRun).order_by(desc(AnalysisRun.created_at)).limit(1)
        result = db.execute(stmt)
        analysis_run = result.scalar_one_or_none()
        
        if not analysis_run:
            # No analysis yet, return empty data
            return {
                "category_data": [],
                "priority_data": [],
                "message": "No analysis runs yet. Run analysis to see ticket distribution."
            }
        
        # Get all ticket analyses for this run
        stmt = select(TicketAnalysis).where(
            TicketAnalysis.analysis_run_id == analysis_run.id
        )
        analyses_result = db.execute(stmt)
        ticket_analyses = list(analyses_result.scalars().all())
        
        # Calculate category distribution
        category_counts: dict = {}
        for analysis in ticket_analyses:
            cat = analysis.category.replace('_', ' ')
            category_counts[cat] = category_counts.get(cat, 0) + 1
        
        category_data = sorted(
            [{"name": name, "count": count} for name, count in category_counts.items()],
            key=lambda x: x["count"],
            reverse=True
        )
        
        # Calculate priority distribution
        priority_counts: dict = {}
        for analysis in ticket_analyses:
            priority_counts[analysis.priority] = priority_counts.get(analysis.priority, 0) + 1
        
        priority_order = {"high": 3, "medium": 2, "low": 1}
        priority_data = sorted(
            [
                {
                    "name": name.capitalize(),
                    "count": count
                } for name, count in priority_counts.items()
            ],
            key=lambda x: priority_order.get(x["name"].lower(), 0),
            reverse=True
        )
        
        return {
            "category_data": category_data,
            "priority_data": priority_data,
            "total_analyzed": len(ticket_analyses)
        }
    
    except Exception as e:
        raise DatabaseError(f"Failed to fetch tickets summary: {str(e)}")


@router.get("/db/view", status_code=status.HTTP_200_OK)
async def view_database(
    db: Session = Depends(get_db)
) -> dict:
    """
    View all database entries for debugging/admin purposes.
    
    Returns:
        Dictionary with tickets, analysis_runs, and ticket_analyses
    """
    try:
        # Get all tickets
        tickets_stmt = select(Ticket).order_by(desc(Ticket.created_at))
        tickets_result = db.execute(tickets_stmt)
        tickets = list(tickets_result.scalars().all())
        
        # Get all analysis runs
        runs_stmt = select(AnalysisRun).order_by(desc(AnalysisRun.created_at))
        runs_result = db.execute(runs_stmt)
        analysis_runs = list(runs_result.scalars().all())
        
        # Get all ticket analyses
        analyses_stmt = select(TicketAnalysis).order_by(desc(TicketAnalysis.created_at))
        analyses_result = db.execute(analyses_stmt)
        ticket_analyses = list(analyses_result.scalars().all())
        
        return {
            "tickets": [
                {
                    "id": t.id,
                    "title": t.title,
                    "description": t.description,
                    "status": t.status,
                    "tags": t.tags,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                    "updated_at": t.updated_at.isoformat() if t.updated_at else None,
                }
                for t in tickets
            ],
            "analysis_runs": [
                {
                    "id": ar.id,
                    "created_at": ar.created_at.isoformat() if ar.created_at else None,
                    "summary": ar.summary,
                    "status": ar.status,
                }
                for ar in analysis_runs
            ],
            "ticket_analyses": [
                {
                    "id": ta.id,
                    "analysis_run_id": ta.analysis_run_id,
                    "ticket_id": ta.ticket_id,
                    "category": ta.category,
                    "priority": ta.priority,
                    "notes": ta.notes,
                    "analysis": ta.analysis,
                    "potential_causes": ta.potential_causes,
                    "suggested_solutions": ta.suggested_solutions,
                    "created_at": ta.created_at.isoformat() if ta.created_at else None,
                }
                for ta in ticket_analyses
            ],
            "counts": {
                "tickets": len(tickets),
                "analysis_runs": len(analysis_runs),
                "ticket_analyses": len(ticket_analyses),
            }
        }
    
    except Exception as e:
        raise DatabaseError(f"Failed to fetch database view: {str(e)}")

