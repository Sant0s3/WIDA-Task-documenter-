"""
Reports API routes.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import User
from app.schemas.schemas import ReportSummary, ComparisonReport
from app.services import report_service
from app.services.auth_utils import get_current_user

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/summary", response_model=ReportSummary)
def get_summary(
    period: str = Query("weekly", regex="^(daily|weekly|monthly)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get period summary report."""
    return report_service.get_summary(db, period=period)


@router.get("/comparison", response_model=ComparisonReport)
def get_comparison(
    period: str = Query("monthly", regex="^(daily|weekly|monthly)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Compare current vs previous period."""
    return report_service.get_comparison(db, period=period)


@router.get("/employee/{employee_id}")
def get_employee_report(
    employee_id: int,
    period: str = Query("monthly", regex="^(daily|weekly|monthly)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get report for specific employee."""
    return report_service.get_employee_report(db, employee_id, period=period)
