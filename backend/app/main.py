"""FastAPI application entry point."""

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.api.routes import router
from app.api.exceptions import (
    AppException,
    app_exception_handler,
    validation_exception_handler
)
from fastapi.exceptions import RequestValidationError
from app.agent.seed_data import seed_database
from app.database import SessionLocal

# Initialize FastAPI app
app = FastAPI(
    title="Support Ticket Analyst API",
    description="AI-powered support ticket analysis with LangGraph",
    version="1.0.0",
)

# Serve static files from React/Vite build
# Path resolution: __file__ is backend/app/main.py
# So: __file__.parent = backend/app, .parent = backend, .parent = project root
frontend_build_path = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
frontend_build_path_legacy = Path(__file__).resolve().parent.parent.parent / "frontend" / "build"
frontend_build_path_docker = Path("/app/frontend/dist")  # Docker volume mount location

# Try Vite dist first, then legacy build
if frontend_build_path.exists() and (frontend_build_path / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_build_path / "assets")), name="assets")
elif frontend_build_path_legacy.exists() and (frontend_build_path_legacy / "static").exists():
    app.mount("/static", StaticFiles(directory=str(frontend_build_path_legacy / "static")), name="static")
elif frontend_build_path_docker.exists() and (frontend_build_path_docker / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_build_path_docker / "assets")), name="assets")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register exception handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

# Include API routes
app.include_router(router)


# Startup event to seed database
@app.on_event("startup")
async def startup_event():
    """Seed database on startup - clears analysis tables and seeds tickets if empty."""
    # Seed by default, can be disabled by setting SEED_DATABASE=false
    import os
    if os.getenv("SEED_DATABASE", "true").lower() != "false":
        db = SessionLocal()
        try:
            # Clears analysis tables and seeds tickets if empty
            seed_database(db)
        finally:
            db.close()
    else:
        print("ℹ️  Database seeding is disabled. Set SEED_DATABASE=true (or omit) to enable.")


# Health check endpoint for Docker
@app.get("/api/health", tags=["health"])
async def health_check():
    """Health check endpoint for Docker healthchecks and monitoring."""
    return {"status": "healthy", "message": "Support Ticket Analyst API is running"}


@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    """Serve React/Vite frontend for all non-API routes."""
    # Don't serve frontend for API routes
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail="Not found")
    
    # Try Vite dist first, then legacy build
    frontend_index = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist" / "index.html"
    frontend_index_legacy = Path(__file__).resolve().parent.parent.parent / "frontend" / "build" / "index.html"
    frontend_index_docker = Path("/app/frontend/dist/index.html")
    
    if frontend_index.exists():
        return FileResponse(str(frontend_index), media_type="text/html")
    elif frontend_index_legacy.exists():
        return FileResponse(str(frontend_index_legacy), media_type="text/html")
    elif frontend_index_docker.exists():
        return FileResponse(str(frontend_index_docker), media_type="text/html")
    
    return {"message": "Support Ticket Analyst API", "version": "1.0.0", "note": "Frontend not built. Run 'npm run build' in frontend directory."}

