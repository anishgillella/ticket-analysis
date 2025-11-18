"""LangGraph agent state definition."""

from typing import TypedDict, List, Optional
from app.models import Ticket


class AnalysisState(TypedDict):
    """State for the ticket analysis agent."""
    run_id: Optional[int]
    ticket_ids: List[int]
    tickets: List[Ticket]
    results: List[dict]  # List of TicketAnalysisOutput dicts
    accumulated_summary: str
    status: str
    error: Optional[str]

