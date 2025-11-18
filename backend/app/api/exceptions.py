"""Custom exception classes and error handlers."""

from datetime import datetime, timezone
from typing import Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.schemas import ErrorResponse, ErrorDetail


class AppException(Exception):
    """Base exception for application errors."""
    def __init__(self, code: str, message: str, details: Optional[str] = None, status_code: int = 500):
        self.code = code
        self.message = message
        self.details = details
        self.status_code = status_code
        super().__init__(self.message)


class ValidationError(AppException):
    """400 - Invalid input validation error."""
    def __init__(self, message: str, details: Optional[str] = None):
        super().__init__("VALIDATION_ERROR", message, details, status_code=status.HTTP_400_BAD_REQUEST)


class NotFoundError(AppException):
    """404 - Resource not found error."""
    def __init__(self, message: str, details: Optional[str] = None):
        super().__init__("NOT_FOUND", message, details, status_code=status.HTTP_404_NOT_FOUND)


class DatabaseError(AppException):
    """500 - Database operation error."""
    def __init__(self, message: str, details: Optional[str] = None):
        super().__init__("DATABASE_ERROR", message, details, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LLMError(AppException):
    """503 - LLM service error."""
    def __init__(self, message: str, details: Optional[str] = None):
        super().__init__("LLM_ERROR", message, details, status_code=status.HTTP_503_SERVICE_UNAVAILABLE)


class GraphExecutionError(AppException):
    """500 - LangGraph execution error."""
    def __init__(self, message: str, details: Optional[str] = None):
        super().__init__("GRAPH_EXECUTION_ERROR", message, details, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle application exceptions."""
    error_response = ErrorResponse(
        error=ErrorDetail(
            code=exc.code,
            message=exc.message,
            details=exc.details
        ),
        trace_id=getattr(request.state, "trace_id", None),
        timestamp=datetime.now(timezone.utc)
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump(mode='json')  # Use mode='json' to serialize datetime
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle Pydantic validation errors."""
    errors = exc.errors()
    error_details = "; ".join([f"{err['loc']}: {err['msg']}" for err in errors])
    
    error_response = ErrorResponse(
        error=ErrorDetail(
            code="VALIDATION_ERROR",
            message="Invalid request format",
            details=error_details
        ),
        trace_id=getattr(request.state, "trace_id", None),
        timestamp=datetime.now(timezone.utc)
    )
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=error_response.model_dump(mode='json')  # Use mode='json' to serialize datetime
    )

