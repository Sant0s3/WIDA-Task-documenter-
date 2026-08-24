"""
Dashboard API route.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import User
from app.schemas.schemas import DashboardResponse
from app.services import dashboard_service
from app.services.auth_utils import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all dashboard data in one call."""
    return dashboard_service.get_dashboard_data(db)
