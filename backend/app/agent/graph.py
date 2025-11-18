"""LangGraph agent graph definition."""

from typing import List, Optional, Any
from langgraph.graph import StateGraph, END
from sqlalchemy.orm import Session

from app.agent.state import AnalysisState
from app.agent.nodes import (
    validate_input,
    initialize_run,
    fetch_tickets,
    analyze_tickets,
    generate_summary,
    save_results
)


def create_analysis_graph(db: Session, langfuse_handler: Optional[Any] = None) -> StateGraph:
    """Create the LangGraph analysis graph."""
    
    # Create graph
    graph = StateGraph(AnalysisState)
    
    # Add nodes
    graph.add_node("validate_input", lambda state: validate_input(state, db))
    graph.add_node("initialize_run", lambda state: initialize_run(state, db))
    graph.add_node("fetch_tickets", lambda state: fetch_tickets(state, db))
    graph.add_node("analyze_tickets", lambda state: analyze_tickets(state, db, langfuse_handler))
    graph.add_node("generate_summary", lambda state: generate_summary(state, db))
    graph.add_node("save_results", lambda state: save_results(state, db))
    
    # Define edges (linear flow)
    graph.set_entry_point("validate_input")
    graph.add_edge("validate_input", "initialize_run")
    graph.add_edge("initialize_run", "fetch_tickets")
    graph.add_edge("fetch_tickets", "analyze_tickets")
    graph.add_edge("analyze_tickets", "generate_summary")
    graph.add_edge("generate_summary", "save_results")
    graph.add_edge("save_results", END)
    
    return graph.compile()


def run_analysis(
    ticket_ids: Optional[List[int]],
    db: Session,
    langfuse_handler: Optional[Any] = None
) -> dict:
    """
    Execute the analysis graph.
    
    Args:
        ticket_ids: Optional list of ticket IDs to analyze. If None, analyzes all tickets.
        db: Database session
        langfuse_handler: Optional LangFuse callback handler for tracing
    
    Returns:
        Dictionary with analysis_run_id and results
    """
    # Initialize state
    initial_state: AnalysisState = {
        "run_id": None,
        "ticket_ids": ticket_ids or [],
        "tickets": [],
        "results": [],
        "accumulated_summary": "",
        "status": "pending",
        "error": None
    }
    
    # Create graph
    graph = create_analysis_graph(db, langfuse_handler)
    
    # Execute graph
    config = {}
    if langfuse_handler:
        config["callbacks"] = [langfuse_handler]
    
    final_state = graph.invoke(initial_state, config=config)
    
    return {
        "run_id": final_state["run_id"],
        "summary": final_state["accumulated_summary"],
        "results": final_state["results"],
        "total_tokens_used": final_state.get("total_tokens_used", 0),
        "total_cost": final_state.get("total_cost", 0.0),
        "status": final_state["status"]
    }

