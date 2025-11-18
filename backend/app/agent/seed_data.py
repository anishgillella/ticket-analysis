"""Seed sample tickets on application startup."""

from sqlalchemy.orm import Session
from app.models import Ticket, AnalysisRun, TicketAnalysis
from sqlalchemy import func

# 20 Sample tickets with status distribution: Open (10), In Progress (5), Resolved (5)
# Categories balanced across all tickets: Bug (5), Billing (5), Feature Request (5), Other (5)
SAMPLE_TICKETS = [
    # BUG (5)
    {
        "title": "App crashes on profile page",
        "description": "Every time I try to access my profile page, the app crashes and I have to restart. This started happening after the last update. Please fix this asap.",
        "status": "open",
        "tags": "bug,crash,critical"
    },
    {
        "title": "Search feature returns no results",
        "description": "I searched for my tickets but the search returns no results even though I know they exist. The search seems to be completely broken.",
        "status": "open",
        "tags": "bug,search"
    },
    {
        "title": "Export functionality not working",
        "description": "When I try to export my data as CSV, nothing happens. I clicked the export button multiple times but no file was downloaded. The feature seems to be broken.",
        "status": "in_progress",
        "tags": "bug,export"
    },
    {
        "title": "Login page keeps redirecting",
        "description": "After entering credentials on the login page, it keeps redirecting back to the login page instead of logging me in. I'm sure my credentials are correct.",
        "status": "in_progress",
        "tags": "bug,authentication"
    },
    {
        "title": "PDF reports not generating",
        "description": "When I try to generate a PDF report, I get an error message. The download never happens and I get no useful error details.",
        "status": "resolved",
        "tags": "bug,pdf,reports"
    },
    # BILLING (5)
    {
        "title": "Payment method declined",
        "description": "My credit card keeps getting declined when I try to checkout. I have plenty of balance and it works fine on other websites. This is the third time this week. Very frustrating!",
        "status": "open",
        "tags": "billing,payment"
    },
    {
        "title": "Wrong billing amount charged",
        "description": "I was charged $150 instead of $50 for my subscription this month. This is the second time this has happened. I need an immediate refund and explanation.",
        "status": "open",
        "tags": "billing,refund,critical"
    },
    {
        "title": "Need refund for duplicate charge",
        "description": "I was charged twice for the same transaction last month. Please process a refund for the duplicate charge ($89.99).",
        "status": "resolved",
        "tags": "billing,refund"
    },
    {
        "title": "Invoice not showing correct itemization",
        "description": "My invoice shows different items than what I actually purchased. The total seems inflated. Can you clarify what I'm being charged for?",
        "status": "in_progress",
        "tags": "billing,invoice"
    },
    {
        "title": "Subscription renewal failed",
        "description": "My subscription was supposed to renew yesterday but I got an error. My account is now inactive. I need to renew immediately.",
        "status": "resolved",
        "tags": "billing,subscription"
    },
    # FEATURE_REQUEST (5)
    {
        "title": "Feature request: Dark mode",
        "description": "Would love to see a dark mode option in the app. It would be much easier on the eyes during night time usage. Many other apps have this feature.",
        "status": "open",
        "tags": "feature_request,ui"
    },
    {
        "title": "Add bulk export capability",
        "description": "It would be great if I could export multiple tickets at once instead of one by one. This would save a lot of time.",
        "status": "open",
        "tags": "feature_request,export"
    },
    {
        "title": "Need advanced filtering options",
        "description": "The current filtering is too basic. I need to filter by multiple criteria at the same time, like status AND priority AND date range.",
        "status": "open",
        "tags": "feature_request,filtering"
    },
    {
        "title": "Mobile app development request",
        "description": "Your web app is great, but I spend most time on mobile. Would love a native iOS and Android app.",
        "status": "in_progress",
        "tags": "feature_request,mobile"
    },
    {
        "title": "API documentation request",
        "description": "Please provide comprehensive API documentation. I want to build integrations with your platform.",
        "status": "resolved",
        "tags": "feature_request,api"
    },
    # OTHER (5)
    {
        "title": "Cannot login to account",
        "description": "I've been trying to log in to my account for the past hour but keep getting 'Invalid credentials' error. I'm sure my password is correct. I've tried resetting it but still no luck. Can you help me urgently?",
        "status": "open",
        "tags": "authentication,urgent"
    },
    {
        "title": "Slow page loading times",
        "description": "The dashboard page takes forever to load. I'm on a high-speed internet connection but it still takes 10+ seconds. Performance is terrible.",
        "status": "open",
        "tags": "performance"
    },
    {
        "title": "Two-factor authentication not working",
        "description": "I enabled 2FA but now I can't log in. The app doesn't recognize my authenticator codes. I'm locked out of my account.",
        "status": "in_progress",
        "tags": "authentication,urgent"
    },
    {
        "title": "Integration with Slack failing",
        "description": "Our Slack integration stopped working. Notifications are no longer being sent to our Slack channel. Did something change on your end?",
        "status": "resolved",
        "tags": "integration,notifications"
    },
    {
        "title": "Database connection timeout",
        "description": "Getting 'database connection timeout' errors intermittently throughout the day. This is causing our application to fail.",
        "status": "open",
        "tags": "infrastructure,critical"
    },
]


def seed_database(db: Session):
    """Seed database with sample tickets and clear analysis tables."""
    try:
        # Always clear analysis tables on startup to ensure clean state
        print("🧹 Clearing analysis tables (analysis_runs and ticket_analysis)...")
        db.query(TicketAnalysis).delete()
        db.query(AnalysisRun).delete()
        db.commit()
        print("✅ Analysis tables cleared!")
        
        # Check if tickets already exist
        ticket_count = db.query(func.count(Ticket.id)).scalar()
        
        if ticket_count > 0:
            print(f"✅ Database already has {ticket_count} tickets. Skipping ticket seed.")
            return
        
        print("🌱 Seeding database with 20 sample tickets...")
        
        for ticket_data in SAMPLE_TICKETS:
            ticket = Ticket(
                title=ticket_data["title"],
                description=ticket_data["description"],
                status=ticket_data["status"],
                tags=ticket_data["tags"]
            )
            db.add(ticket)
        
        db.commit()
        print(f"✅ Successfully seeded {len(SAMPLE_TICKETS)} tickets!")
        
    except Exception as e:
        print(f"❌ Seeding failed: {str(e)}")
        db.rollback()

