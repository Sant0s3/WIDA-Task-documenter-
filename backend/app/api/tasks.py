"""
Task API routes.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import User
from app.schemas.schemas import TaskCreate, TaskUpdate, TaskResponse, TaskWithAnalytics
from app.services import task_service
from app.services.auth_utils import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


@router.get("/analytics")
def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get task analytics (overdue, at-risk, on-track counts)."""
    return task_service.get_task_analytics(db)


@router.get("", response_model=List[TaskResponse])
def list_tasks(
    status: Optional[str] = Query(None),
    employee_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List tasks with optional filters."""
    tasks = task_service.get_tasks(db, status_filter=status, employee_id=employee_id)
    result = []
    for t in tasks:
        employee_name = t.employee.name if t.employee else None
        result.append(TaskResponse(
            id=t.id,
            title=t.title,
            employee_id=t.employee_id,
            employee_name=employee_name,
            start_date=t.start_date,
            due_date=t.due_date,
            status=t.status,
            progress=t.progress,
            expected_duration=t.expected_duration,
            notes=t.notes,
            created_at=t.created_at,
            updated_at=t.updated_at,
        ))
    return result


@router.get("/{task_id}", response_model=TaskWithAnalytics)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get task with computed analytics."""
    result = task_service.get_task_with_analytics(db, task_id)
    if not result:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    return result


@router.post("", response_model=TaskResponse, status_code=201)
def create_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new task."""
    task = task_service.create_task(db, data)
    employee_name = task.employee.name if task.employee else None
    return TaskResponse(
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
    )


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update task."""
    task = task_service.update_task(db, task_id, data)
    if not task:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    employee_name = task.employee.name if task.employee else None
    return TaskResponse(
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
    )


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete task."""
    if not task_service.delete_task(db, task_id):
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    return {"message": "تم حذف المهمة بنجاح"}
