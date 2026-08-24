"""
Task service — CRUD + deterministic analytics.
"""
from typing import List, Optional
from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import Task, TaskStatus
from app.schemas.schemas import TaskCreate, TaskUpdate, TaskWithAnalytics


def get_tasks(
    db: Session,
    status_filter: Optional[str] = None,
    employee_id: Optional[int] = None,
) -> List[Task]:
    query = db.query(Task)
    if status_filter:
        query = query.filter(Task.status == status_filter)
    if employee_id:
        query = query.filter(Task.employee_id == employee_id)
    return query.order_by(Task.created_at.desc()).all()


def get_task(db: Session, task_id: int) -> Optional[Task]:
    return db.query(Task).filter(Task.id == task_id).first()


def get_task_with_analytics(db: Session, task_id: int) -> Optional[TaskWithAnalytics]:
    task = get_task(db, task_id)
    if not task:
        return None
    return _compute_analytics(task)


def create_task(db: Session, data: TaskCreate) -> Task:
    task = Task(**data.model_dump())
    # Auto-set progress based on status
    if data.status == TaskStatus.COMPLETED.value:
        task.progress = 100
    elif data.status == TaskStatus.NOT_STARTED.value:
        task.progress = 0
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, task_id: int, data: TaskUpdate) -> Optional[Task]:
    task = get_task(db, task_id)
    if not task:
        return None
    update_data = data.model_dump(exclude_unset=True)

    # Auto-sync status <-> progress
    if "status" in update_data:
        if update_data["status"] == TaskStatus.COMPLETED.value:
            update_data["progress"] = 100
        elif update_data["status"] == TaskStatus.NOT_STARTED.value:
            update_data["progress"] = 0
    elif "progress" in update_data:
        if update_data["progress"] == 100:
            update_data["status"] = TaskStatus.COMPLETED.value
        elif update_data["progress"] == 0:
            update_data["status"] = TaskStatus.NOT_STARTED.value
        elif update_data["progress"] > 0:
            update_data["status"] = TaskStatus.IN_PROGRESS.value

    for key, value in update_data.items():
        setattr(task, key, value)
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task_id: int) -> bool:
    task = get_task(db, task_id)
    if not task:
        return False
    db.delete(task)
    db.commit()
    return True


def get_task_analytics(db: Session) -> dict:
    """Get aggregate task analytics."""
    today = date.today()

    total = db.query(func.count(Task.id)).scalar() or 0
    completed = db.query(func.count(Task.id)).filter(
        Task.status == TaskStatus.COMPLETED.value
    ).scalar() or 0
    in_progress = db.query(func.count(Task.id)).filter(
        Task.status == TaskStatus.IN_PROGRESS.value
    ).scalar() or 0
    not_started = db.query(func.count(Task.id)).filter(
        Task.status == TaskStatus.NOT_STARTED.value
    ).scalar() or 0

    overdue = db.query(func.count(Task.id)).filter(
        Task.due_date < today,
        Task.status != TaskStatus.COMPLETED.value
    ).scalar() or 0

    # At risk: due within 3 days and not completed
    at_risk_date = today
    from datetime import timedelta
    at_risk_end = today + timedelta(days=3)
    at_risk = db.query(func.count(Task.id)).filter(
        Task.due_date >= at_risk_date,
        Task.due_date <= at_risk_end,
        Task.status != TaskStatus.COMPLETED.value
    ).scalar() or 0

    return {
        "total": total,
        "completed": completed,
        "in_progress": in_progress,
        "not_started": not_started,
        "overdue": overdue,
        "at_risk": at_risk,
        "on_track": total - completed - overdue - at_risk,
    }


def _compute_analytics(task: Task) -> TaskWithAnalytics:
    """Compute deterministic analytics for a single task."""
    today = date.today()

    days_elapsed = None
    days_remaining = None
    is_overdue = False
    risk_level = "on_track"

    if task.start_date:
        days_elapsed = (today - task.start_date).days
        if days_elapsed < 0:
            days_elapsed = 0

    if task.due_date:
        days_remaining = (task.due_date - today).days
        if task.status != TaskStatus.COMPLETED.value:
            if days_remaining < 0:
                is_overdue = True
                risk_level = "overdue"
            elif days_remaining <= 3:
                risk_level = "at_risk"

    employee_name = task.employee.name if task.employee else None

    return TaskWithAnalytics(
        id=task.id,
        title=task.title,
        employee_id=task.employee_id,
        employee_name=employee_name,
        start_date=task.start_date,
        due_date=task.due_date,
        status=task.status,
        progress=task.progress,
        expected_duration=task.expected_duration,
        notes=task.notes,
        created_at=task.created_at,
        updated_at=task.updated_at,
        days_elapsed=days_elapsed,
        days_remaining=days_remaining,
        is_overdue=is_overdue,
        risk_level=risk_level,
    )
