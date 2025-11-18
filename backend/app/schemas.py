"""Pydantic schemas for request/response validation and LLM outputs."""

from datetime import datetime, timezone
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator


# ===== Request Schemas =====

class TicketCreate(BaseModel):
    """Schema for creating a ticket."""
    title: str = Field(..., min_length=1, max_length=255, description="Ticket title")
    description: str = Field(..., min_length=1, description="Ticket description")
    status: Optional[str] = Field(default="open", description="Ticket status: open, in_progress, resolved, closed")
    tags: Optional[str] = Field(default=None, description="Comma-separated tags")


class TicketUpdate(BaseModel):
    """Schema for updating a ticket."""
    title: Optional[str] = Field(None, min_length=1, max_length=255, description="Ticket title")
    description: Optional[str] = Field(None, min_length=1, description="Ticket description")
    status: Optional[str] = Field(None, description="Ticket status: open, in_progress, resolved, closed")
    tags: Optional[str] = Field(None, description="Comma-separated tags")


class AnalyzeRequest(BaseModel):
    """Schema for analysis request."""
    ticket_ids: Optional[List[int]] = Field(
        None,
        description="Optional list of ticket IDs to analyze. If not provided, analyzes all tickets."
    )


# ===== Response Schemas =====

class TicketResponse(BaseModel):
    """Schema for ticket response."""
    id: int
    title: str
    description: str
    status: str
    tags: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True  # Enable ORM mode


class TicketAnalysisResponse(BaseModel):
    """Schema for ticket analysis response."""
    id: int
    analysis_run_id: int
    ticket_id: int
    category: str
    priority: str
    notes: Optional[str] = None
    analysis: Optional[str] = None
    potential_causes: Optional[str] = None  # JSON array as string
    suggested_solutions: Optional[str] = None  # JSON array as string
    created_at: datetime
    
    class Config:
        from_attributes = True


class AnalysisRunResponse(BaseModel):
    """Schema for analysis run response."""
    id: int
    created_at: datetime
    summary: str
    status: str
    
    class Config:
        from_attributes = True


class AnalyzeResponse(BaseModel):
    """Schema for analyze endpoint response."""
    analysis_run: AnalysisRunResponse
    ticket_analyses: List[TicketAnalysisResponse]


class AnalysisHistoryResponse(BaseModel):
    """Schema for analysis history response."""
    analysis_runs: List[AnalysisRunResponse]


# ===== LLM Output Schemas =====

class TicketAnalysisOutput(BaseModel):
    """Schema for LLM-structured output when analyzing a ticket.
    
    This model ensures structured output that maps directly to frontend cards:
    - category -> Categories card
    - priority -> Priority card  
    - analysis -> Detailed Analysis card
    - potential_causes -> Detailed Analysis card (bulleted list)
    - suggested_solutions -> Detailed Analysis card (numbered list)
    """
    category: Literal["bug", "billing", "feature_request", "other"] = Field(
        ...,
        description="Category of the ticket: bug, billing, feature_request, or other"
    )
    priority: Literal["low", "medium", "high"] = Field(
        ...,
        description="Priority level: low, medium, or high"
    )
    analysis: str = Field(
        ...,
        min_length=10,
        max_length=500,
        description="Brief explanation of the issue (1-2 sentences, 10-500 characters)"
    )
    potential_causes: List[str] = Field(
        ...,
        min_length=2,
        max_length=3,
        description="List of 2-3 likely root causes (each 10-150 characters)"
    )
    suggested_solutions: List[str] = Field(
        ...,
        min_length=2,
        max_length=3,
        description="List of 2-3 actionable next steps (each 10-150 characters)"
    )
    
    @field_validator('potential_causes', 'suggested_solutions')
    @classmethod
    def validate_list_items(cls, v: List[str]) -> List[str]:
        """Validate each item in the list has proper length."""
        for item in v:
            if len(item) < 10:
                raise ValueError(f"Each item must be at least 10 characters, got: {item[:50]}")
            if len(item) > 150:
                raise ValueError(f"Each item must be at most 150 characters, got: {len(item)} chars")
        return v
    


# ===== Error Schemas =====

class ErrorDetail(BaseModel):
    """Schema for error details."""
    code: str = Field(..., description="Error code")
    message: str = Field(..., description="Error message")
    details: Optional[str] = Field(None, description="Additional error details")


class ErrorResponse(BaseModel):
    """Schema for error responses."""
    error: ErrorDetail
    trace_id: Optional[str] = Field(None, description="Request trace ID for debugging")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

