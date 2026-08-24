"""
Report service — SQL aggregation for all report types.
"""
from datetime import date, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import (
    Employee, Task, DailyActivity, EntityType, ActionType, TaskStatus
)
from app.schemas.schemas import ReportSummary, ComparisonReport


def _get_period_dates(period: str, ref_date: Optional[date] = None) -> tuple:
    """Get start and end dates for a period."""
    today = ref_date or date.today()
    if period == "daily":
        return today, today
    elif period == "weekly":
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
        return start, end
    elif period == "monthly":
        start = today.replace(day=1)
        if today.month == 12:
            end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
        return start, end
    return today - timedelta(days=30), today


def _get_previous_period_dates(period: str, ref_date: Optional[date] = None) -> tuple:
    """Get start and end dates for the previous period."""
    today = ref_date or date.today()
    if period == "daily":
        yesterday = today - timedelta(days=1)
        return yesterday, yesterday
    elif period == "weekly":
        start = today - timedelta(days=today.weekday()) - timedelta(days=7)
        end = start + timedelta(days=6)
        return start, end
    elif period == "monthly":
        first_of_month = today.replace(day=1)
        last_of_prev = first_of_month - timedelta(days=1)
        first_of_prev = last_of_prev.replace(day=1)
        return first_of_prev, last_of_prev
    return today - timedelta(days=60), today - timedelta(days=31)


def get_summary(db: Session, period: str = "weekly") -> ReportSummary:
    """Get period summary report."""
    start_date, end_date = _get_period_dates(period)
    return _build_summary(db, period, start_date, end_date)


def _build_summary(
    db: Session, period: str, start_date: date, end_date: date
) -> ReportSummary:
    # Total activities and quantity
    totals = db.query(
        func.count(DailyActivity.id),
        func.coalesce(func.sum(DailyActivity.quantity), 0),
    ).filter(
        DailyActivity.activity_date >= start_date,
        DailyActivity.activity_date <= end_date,
    ).first()

    # By employee
    by_employee = (
        db.query(
            Employee.name,
            func.count(DailyActivity.id).label("activities"),
            func.coalesce(func.sum(DailyActivity.quantity), 0).label("quantity"),
        )
        .join(DailyActivity, DailyActivity.employee_id == Employee.id)
        .filter(
            DailyActivity.activity_date >= start_date,
            DailyActivity.activity_date <= end_date,
        )
        .group_by(Employee.name)
        .order_by(func.sum(DailyActivity.quantity).desc())
        .all()
    )

    # By entity
    by_entity = (
        db.query(
            EntityType.display_name,
            func.coalesce(func.sum(DailyActivity.quantity), 0).label("quantity"),
        )
        .join(DailyActivity, DailyActivity.entity_type_id == EntityType.id)
        .filter(
            DailyActivity.activity_date >= start_date,
            DailyActivity.activity_date <= end_date,
        )
        .group_by(EntityType.display_name)
        .order_by(func.sum(DailyActivity.quantity).desc())
        .all()
    )

    # By action
    by_action = (
        db.query(
            ActionType.display_name,
            func.coalesce(func.sum(DailyActivity.quantity), 0).label("quantity"),
        )
        .join(DailyActivity, DailyActivity.action_type_id == ActionType.id)
        .filter(
            DailyActivity.activity_date >= start_date,
            DailyActivity.activity_date <= end_date,
        )
        .group_by(ActionType.display_name)
        .order_by(func.sum(DailyActivity.quantity).desc())
        .all()
    )

    # Task stats
    tasks_completed = db.query(func.count(Task.id)).filter(
        Task.status == TaskStatus.COMPLETED.value,
        Task.updated_at >= str(start_date),
        Task.updated_at <= str(end_date) + " 23:59:59",
    ).scalar() or 0

    tasks_in_progress = db.query(func.count(Task.id)).filter(
        Task.status == TaskStatus.IN_PROGRESS.value,
    ).scalar() or 0

    tasks_overdue = db.query(func.count(Task.id)).filter(
        Task.due_date < date.today(),
        Task.status != TaskStatus.COMPLETED.value,
    ).scalar() or 0

    return ReportSummary(
        period=f"{start_date.isoformat()} to {end_date.isoformat()}",
        total_activities=totals[0] or 0,
        total_quantity=totals[1] or 0,
        by_employee=[
            {"name": e[0], "activities": e[1], "quantity": e[2]}
            for e in by_employee
        ],
        by_entity=[
            {"name": e[0], "quantity": e[1]}
            for e in by_entity
        ],
        by_action=[
            {"name": a[0], "quantity": a[1]}
            for a in by_action
        ],
        tasks_completed=tasks_completed,
        tasks_in_progress=tasks_in_progress,
        tasks_overdue=tasks_overdue,
    )


def get_comparison(db: Session, period: str = "monthly") -> ComparisonReport:
    """Compare current period with previous period."""
    current_start, current_end = _get_period_dates(period)
    prev_start, prev_end = _get_previous_period_dates(period)

    current = _build_summary(db, period, current_start, current_end)
    previous = _build_summary(db, period, prev_start, prev_end)

    change = 0.0
    if previous.total_quantity > 0:
        change = ((current.total_quantity - previous.total_quantity) / previous.total_quantity) * 100

    return ComparisonReport(
        current_period=current,
        previous_period=previous,
        change_percentage=round(change, 1),
    )


def get_employee_report(db: Session, employee_id: int, period: str = "monthly") -> dict:
    """Get report for a specific employee."""
    start_date, end_date = _get_period_dates(period)

    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        return {}

    # Activities by entity
    by_entity = (
        db.query(
            EntityType.display_name,
            func.coalesce(func.sum(DailyActivity.quantity), 0).label("quantity"),
        )
        .join(DailyActivity, DailyActivity.entity_type_id == EntityType.id)
        .filter(
            DailyActivity.employee_id == employee_id,
            DailyActivity.activity_date >= start_date,
            DailyActivity.activity_date <= end_date,
        )
        .group_by(EntityType.display_name)
        .all()
    )

    # Activities by action
    by_action = (
        db.query(
            ActionType.display_name,
            func.coalesce(func.sum(DailyActivity.quantity), 0).label("quantity"),
        )
        .join(DailyActivity, DailyActivity.action_type_id == ActionType.id)
        .filter(
            DailyActivity.employee_id == employee_id,
            DailyActivity.activity_date >= start_date,
            DailyActivity.activity_date <= end_date,
        )
        .group_by(ActionType.display_name)
        .all()
    )

    total_quantity = db.query(
        func.coalesce(func.sum(DailyActivity.quantity), 0)
    ).filter(
        DailyActivity.employee_id == employee_id,
        DailyActivity.activity_date >= start_date,
        DailyActivity.activity_date <= end_date,
    ).scalar() or 0

    # Daily trend
    daily_trend = []
    day_count = (end_date - start_date).days + 1
    for i in range(day_count):
        d = start_date + timedelta(days=i)
        count = db.query(
            func.coalesce(func.sum(DailyActivity.quantity), 0)
        ).filter(
            DailyActivity.employee_id == employee_id,
            DailyActivity.activity_date == d,
        ).scalar() or 0
        daily_trend.append({"date": d.isoformat(), "count": count})

    return {
        "employee_name": employee.name,
        "employee_role": employee.role,
        "period": f"{start_date.isoformat()} to {end_date.isoformat()}",
        "total_quantity": total_quantity,
        "by_entity": [{"name": e[0], "quantity": e[1]} for e in by_entity],
        "by_action": [{"name": a[0], "quantity": a[1]} for a in by_action],
        "daily_trend": daily_trend,
    }
