"""
Dashboard service — aggregated queries for dashboard widgets.
"""
from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import (
    Employee, Task, DailyActivity, EntityType, ActionType, TaskStatus
)
from app.schemas.schemas import (
    DashboardStats, EmployeePerformance, EntityBreakdown,
    ActivityResponse, DashboardResponse
)


def get_dashboard_data(db: Session) -> DashboardResponse:
    today = date.today()
    week_ago = today - timedelta(days=7)

    # Stats
    stats = DashboardStats(
        today_activities=db.query(func.coalesce(func.sum(DailyActivity.quantity), 0)).filter(
            DailyActivity.activity_date == today
        ).scalar() or 0,
        total_activities=db.query(func.coalesce(func.sum(DailyActivity.quantity), 0)).scalar() or 0,
        total_tasks=db.query(func.count(Task.id)).scalar() or 0,
        completed_tasks=db.query(func.count(Task.id)).filter(
            Task.status == TaskStatus.COMPLETED.value
        ).scalar() or 0,
        in_progress_tasks=db.query(func.count(Task.id)).filter(
            Task.status == TaskStatus.IN_PROGRESS.value
        ).scalar() or 0,
        overdue_tasks=db.query(func.count(Task.id)).filter(
            Task.due_date < today,
            Task.status != TaskStatus.COMPLETED.value
        ).scalar() or 0,
        total_employees=db.query(func.count(Employee.id)).scalar() or 0,
        active_employees=db.query(func.count(Employee.id)).filter(
            Employee.active == True
        ).scalar() or 0,
    )

    # Employee performance (last 7 days)
    perf_query = (
        db.query(
            Employee.id,
            Employee.name,
            func.count(DailyActivity.id).label("total_activities"),
            func.coalesce(func.sum(DailyActivity.quantity), 0).label("total_quantity"),
        )
        .join(DailyActivity, DailyActivity.employee_id == Employee.id)
        .filter(DailyActivity.activity_date >= week_ago)
        .group_by(Employee.id, Employee.name)
        .order_by(func.sum(DailyActivity.quantity).desc())
        .limit(10)
        .all()
    )
    employee_performance = [
        EmployeePerformance(
            employee_id=p[0],
            employee_name=p[1],
            total_activities=p[2],
            total_quantity=p[3],
        )
        for p in perf_query
    ]

    # Entity breakdown (last 7 days)
    entity_query = (
        db.query(
            EntityType.display_name,
            func.coalesce(func.sum(DailyActivity.quantity), 0).label("total_quantity"),
        )
        .join(DailyActivity, DailyActivity.entity_type_id == EntityType.id)
        .filter(DailyActivity.activity_date >= week_ago)
        .group_by(EntityType.display_name)
        .order_by(func.sum(DailyActivity.quantity).desc())
        .all()
    )
    entity_breakdown = [
        EntityBreakdown(entity_name=e[0], total_quantity=e[1])
        for e in entity_query
    ]

    # Recent activities (last 10)
    recent_query = (
        db.query(DailyActivity)
        .order_by(DailyActivity.created_at.desc())
        .limit(10)
        .all()
    )
    recent_activities = [
        ActivityResponse(
            id=a.id,
            employee_id=a.employee_id,
            employee_name=a.employee.name if a.employee else None,
            task_id=a.task_id,
            entity_type_id=a.entity_type_id,
            entity_type_name=a.entity_type.display_name if a.entity_type else None,
            action_type_id=a.action_type_id,
            action_type_name=a.action_type.display_name if a.action_type else None,
            quantity=a.quantity,
            activity_date=a.activity_date,
            notes=a.notes,
            source_text=a.source_text,
            created_at=a.created_at,
        )
        for a in recent_query
    ]

    # Activity trend (last 7 days)
    trend_data = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        count = db.query(func.coalesce(func.sum(DailyActivity.quantity), 0)).filter(
            DailyActivity.activity_date == d
        ).scalar() or 0
        trend_data.append({
            "date": d.isoformat(),
            "count": count,
        })

    return DashboardResponse(
        stats=stats,
        employee_performance=employee_performance,
        entity_breakdown=entity_breakdown,
        recent_activities=recent_activities,
        activity_trend=trend_data,
    )
