"""LangGraph agent node implementations."""

from typing import List, Optional, Any
from sqlalchemy.orm import Session
from openai import OpenAI
import json
from concurrent.futures import ThreadPoolExecutor, as_completed

from app.agent.state import AnalysisState
from app.agent.db_service import (
    get_tickets_by_ids,
    get_all_tickets,
    create_analysis_run,
    update_analysis_run,
    save_ticket_analyses
)
from app.schemas import TicketAnalysisOutput
from app.config import settings
from app.api.exceptions import ValidationError, DatabaseError, LLMError

# LangFuse tracing will be re-enabled after core analysis is working


def validate_input(state: AnalysisState, db: Session) -> AnalysisState:
    """Node 1: Validate input ticket IDs."""
    ticket_ids = state.get("ticket_ids", [])
    
    if ticket_ids:
        # Check if tickets exist
        tickets = get_tickets_by_ids(db, ticket_ids)
        if len(tickets) != len(ticket_ids):
            found_ids = {t.id for t in tickets}
            missing_ids = set(ticket_ids) - found_ids
            raise ValidationError(
                f"Some ticket IDs not found",
                f"Missing ticket IDs: {missing_ids}"
            )
    
    state["status"] = "validated"
    return state


def initialize_run(state: AnalysisState, db: Session) -> AnalysisState:
    """Node 2: Initialize analysis run."""
    analysis_run = create_analysis_run(db, summary="")
    state["run_id"] = analysis_run.id
    state["status"] = "run_created"
    return state


def fetch_tickets(state: AnalysisState, db: Session) -> AnalysisState:
    """Node 3: Fetch tickets from database."""
    ticket_ids = state.get("ticket_ids", [])
    
    if ticket_ids:
        tickets = get_tickets_by_ids(db, ticket_ids)
    else:
        tickets = get_all_tickets(db)
    
    if not tickets:
        raise ValidationError("No tickets found to analyze")
    
    state["tickets"] = tickets
    state["ticket_ids"] = [t.id for t in tickets]
    state["status"] = "tickets_fetched"
    return state


def analyze_tickets(state: AnalysisState, db: Session, langfuse_handler: Optional[object] = None) -> AnalysisState:
    """Node 4: Analyze each ticket using OpenRouter API."""
    if not settings.openrouter_api_key:
        raise LLMError("OpenRouter API key not configured")
    
    print(f"🔍 Starting analysis of {len(state['tickets'])} tickets...")
    
    tickets = state["tickets"]
    results = []
    total_tokens_used = 0
    total_cost = 0.0
    
    # Initialize OpenAI client (OpenRouter compatible)
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.openrouter_api_key,
    )
    
    def analyze_single_ticket(ticket):
        """Analyze a single ticket (can be called in parallel)."""
        try:
            print(f"📝 Analyzing ticket {ticket.id}...")
            
            # Prepare prompt with clear JSON structure instructions
            prompt = f"""You are a support ticket analyst. Analyze this ticket and respond ONLY with valid JSON.

Ticket:
Title: {ticket.title}
Description: {ticket.description}
Status: {ticket.status}
Tags: {ticket.tags or 'None'}

Respond with ONLY this JSON structure (no markdown, no extra text):
{{
  "category": "bug" or "billing" or "feature_request" or "other",
  "priority": "low" or "medium" or "high",
  "analysis": "brief explanation of the issue (1-2 sentences)",
  "potential_causes": ["cause 1", "cause 2", "cause 3"],
  "suggested_solutions": ["solution 1", "solution 2", "solution 3"]
}}"""

            # Generate JSON schema from Pydantic model
            # This ensures the schema always matches the model structure
            json_schema = TicketAnalysisOutput.model_json_schema()
            
            # Extract enum values from Literal types (Pydantic v2 represents them as "anyOf" with "const")
            def extract_enum_from_schema(prop_schema: dict) -> list:
                """Extract enum values from Pydantic Literal type schema."""
                if "enum" in prop_schema:
                    return prop_schema["enum"]
                elif "anyOf" in prop_schema:
                    # Pydantic v2 represents Literal as anyOf with const values
                    return [item["const"] for item in prop_schema["anyOf"] if "const" in item]
                return []
            
            # OpenRouter requires specific format - extract and format the schema
            # This ensures the schema matches the Pydantic model exactly
            category_prop = json_schema["properties"]["category"]
            priority_prop = json_schema["properties"]["priority"]
            analysis_prop = json_schema["properties"]["analysis"]
            causes_prop = json_schema["properties"]["potential_causes"]
            solutions_prop = json_schema["properties"]["suggested_solutions"]
            
            formatted_schema = {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "enum": extract_enum_from_schema(category_prop) or ["bug", "billing", "feature_request", "other"],
                        "description": category_prop.get("description", "Category of the ticket")
                    },
                    "priority": {
                        "type": "string",
                        "enum": extract_enum_from_schema(priority_prop) or ["low", "medium", "high"],
                        "description": priority_prop.get("description", "Priority level")
                    },
                    "analysis": {
                        "type": "string",
                        "minLength": analysis_prop.get("minLength", 10),
                        "maxLength": analysis_prop.get("maxLength", 500),
                        "description": analysis_prop.get("description", "Brief explanation of the issue")
                    },
                    "potential_causes": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "minLength": 10,
                            "maxLength": 150
                        },
                        "minItems": causes_prop.get("minItems", 2),
                        "maxItems": causes_prop.get("maxItems", 3),
                        "description": causes_prop.get("description", "List of 2-3 potential root causes")
                    },
                    "suggested_solutions": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "minLength": 10,
                            "maxLength": 150
                        },
                        "minItems": solutions_prop.get("minItems", 2),
                        "maxItems": solutions_prop.get("maxItems", 3),
                        "description": solutions_prop.get("description", "List of 2-3 suggested solutions")
                    }
                },
                "required": json_schema.get("required", ["category", "priority", "analysis", "potential_causes", "suggested_solutions"]),
                "additionalProperties": False
            }
            
            # Call OpenRouter with structured output mode using Pydantic-generated schema
            response = client.beta.chat.completions.create(
                model="openai/gpt-5-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a support ticket analyst. Always respond with valid JSON only. Never include markdown, explanations, or extra text. Ensure all strings are properly escaped. The output will be validated against a strict schema."
                    },
                    {"role": "user", "content": prompt}
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "TicketAnalysis",
                        "strict": True,
                        "schema": formatted_schema
                    }
                },
                max_tokens=800,
                temperature=0.3,
            )
            
            # Parse response
            content = response.choices[0].message.content
            print(f"   ✅ Raw response received ({len(content)} chars)")
            
            # Validate response against Pydantic model
            # This ensures the structure matches what frontend cards expect
            try:
                analysis_output = TicketAnalysisOutput.model_validate_json(content)
                print(f"   ✅ Pydantic validation passed")
                print(f"      Category: {analysis_output.category} -> Categories card")
                print(f"      Priority: {analysis_output.priority} -> Priority card")
                print(f"      Analysis: {len(analysis_output.analysis)} chars -> Detailed Analysis card")
                print(f"      Causes: {len(analysis_output.potential_causes)} items -> Detailed Analysis card")
                print(f"      Solutions: {len(analysis_output.suggested_solutions)} items -> Detailed Analysis card")
            except Exception as json_err:
                print(f"   ⚠️ Pydantic validation error: {str(json_err)[:200]}")
                print(f"   📋 Content preview: {content[:500]}")
                raise ValidationError(f"Failed to validate LLM output against schema: {str(json_err)}")
            
            # Track tokens and cost (based on OpenRouter pricing)
            input_tokens = response.usage.prompt_tokens
            output_tokens = response.usage.completion_tokens
            tokens_used = input_tokens + output_tokens
            
            # GPT-5-Mini pricing: $0.25/M input tokens, $2/M output tokens
            input_cost = (input_tokens / 1_000_000) * 0.25
            output_cost = (output_tokens / 1_000_000) * 2.0
            cost = input_cost + output_cost
            
            # Store result
            result = {
                "ticket_id": ticket.id,
                "category": analysis_output.category,
                "priority": analysis_output.priority,
                "analysis": analysis_output.analysis,
                "potential_causes": analysis_output.potential_causes,
                "suggested_solutions": analysis_output.suggested_solutions,
                "notes": analysis_output.analysis,  # Keep for backward compatibility
                "tokens": tokens_used,
                "cost": cost
            }
            print(f"✅ Ticket {ticket.id} analyzed successfully")
            return result
            
        except Exception as e:
            print(f"❌ Error analyzing ticket {ticket.id}: {str(e)}")
            import traceback
            traceback.print_exc()
            raise LLMError(
                f"Failed to analyze ticket {ticket.id}",
                str(e)
            )
    
    # Analyze tickets in parallel (max 5 concurrent)
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(analyze_single_ticket, ticket): ticket for ticket in tickets}
        
        for future in as_completed(futures):
            try:
                result = future.result()
                tokens = result.pop("tokens", 0)
                cost = result.pop("cost", 0.0)
                results.append(result)
                total_tokens_used += tokens
                total_cost += cost
            except Exception as e:
                # Error is already printed in analyze_single_ticket
                raise
    
    state["results"] = results
    state["total_tokens_used"] = total_tokens_used
    state["total_cost"] = total_cost
    state["status"] = "analyzed"
    return state


def generate_summary(state: AnalysisState, db: Session) -> AnalysisState:
    """Node 5: Generate overall summary from all analyses using agent-driven logic."""
    results = state["results"]
    tickets = state["tickets"]
    
    if not results:
        state["accumulated_summary"] = "No tickets analyzed."
        state["status"] = "summarized"
        return state
    
    try:
        # Agent-driven summary: dynamically analyze the data without hardcoding
        category_counts: dict = {}
        priority_counts: dict = {}
        
        # Aggregate all results
        for result in results:
            cat = result['category']
            category_counts[cat] = category_counts.get(cat, 0) + 1
            priority_counts[result['priority']] = priority_counts.get(result['priority'], 0) + 1
        
        # Calculate statistics
        top_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)
        
        # Build dynamic summary based on the actual data patterns
        summary_parts = []
        
        # Part 1: Overall count
        summary_parts.append(f"Analyzed {len(results)} support ticket{'s' if len(results) != 1 else ''}.")
        
        # Part 2: Category distribution
        if top_categories:
            category_descriptions = []
            for cat, count in top_categories[:5]:  # Top 5 categories
                pct = (count / len(results)) * 100
                category_descriptions.append(f"{count} {cat.replace('_', ' ')} ({pct:.0f}%)")
            summary_parts.append(f"Categories: {', '.join(category_descriptions)}.")
        
        # Part 3: Priority breakdown
        priority_summary = []
        for priority in ['high', 'medium', 'low']:
            count = priority_counts.get(priority, 0)
            if count > 0:
                pct = (count / len(results)) * 100
                priority_summary.append(f"{count} {priority}-priority ({pct:.0f}%)")
        
        if priority_summary:
            summary_parts.append(f"Priority breakdown: {', '.join(priority_summary)}.")
        
        # Part 4: Problem overview from ALL ticket analysis
        problem_themes = []
        for result in results:  # Iterate through ALL tickets
            # Try to get analysis, fall back to notes
            analysis_text = result.get('analysis') or result.get('notes')
            if analysis_text and len(problem_themes) < 5:  # Collect up to 5 key issues
                # Extract first sentence or first 50 chars
                sentence = analysis_text.split('.')[0] if '.' in analysis_text else analysis_text[:80]
                if sentence.strip() and sentence not in problem_themes:
                    problem_themes.append(sentence.strip())
        
        if problem_themes:
            # If more than 3, show first few, then indicate there are more
            if len(problem_themes) > 3:
                issues_text = "; ".join(problem_themes[:3]) + f"; +{len(problem_themes) - 3} more"
            else:
                issues_text = "; ".join(problem_themes)
            summary_parts.append(f"Key issues: {issues_text}.")
        
        # Part 6: Actionable insights
        high_priority_count = priority_counts.get('high', 0)
        if high_priority_count > 0:
            summary_parts.append(f"⚠️  {high_priority_count} high-priority issue{'s' if high_priority_count != 1 else ''} require{'s' if high_priority_count == 1 else ''} immediate attention.")
        
        # Combine all parts
        summary = " ".join(summary_parts)
        
        state["accumulated_summary"] = summary
        state["status"] = "summarized"
        
    except Exception as e:
        # Fallback to basic summary
        state["accumulated_summary"] = f"Analyzed {len(results)} support tickets."
        state["status"] = "summarized"
    
    return state


def save_results(state: AnalysisState, db: Session) -> AnalysisState:
    """Node 6: Save all results to database."""
    run_id = state["run_id"]
    summary = state["accumulated_summary"]
    results = state["results"]
    
    try:
        # Update analysis run
        update_analysis_run(
            db=db,
            run_id=run_id,
            summary=summary,
            status="completed"
        )
        
        # Save ticket analyses
        save_ticket_analyses(db=db, run_id=run_id, analyses=results)
        
        state["status"] = "saved"
        return state

    except Exception as e:
        raise DatabaseError(f"Failed to save analysis results: {str(e)}")
