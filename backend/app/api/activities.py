"""
Activities API routes.
"""
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import User
from app.schemas.schemas import ActivityCreate, ActivityResponse, BulkActivityCreate
from app.services import activity_service
from app.services.auth_utils import get_current_user

router = APIRouter(prefix="/api/activities", tags=["Activities"])


@router.get("", response_model=List[ActivityResponse])
def list_activities(
    employee_id: Optional[int] = Query(None),
    entity_type_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List activities with filters."""
    activities = activity_service.get_activities(
        db,
        employee_id=employee_id,
        entity_type_id=entity_type_id,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
    )
    return [
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
        for a in activities
    ]


@router.post("", response_model=ActivityResponse, status_code=201)
def create_activity(
    data: ActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a single activity."""
    activity = activity_service.create_activity(db, data)
    return ActivityResponse(
        id=activity.id,
        employee_id=activity.employee_id,
        employee_name=activity.employee.name if activity.employee else None,
        task_id=activity.task_id,
        entity_type_id=activity.entity_type_id,
        entity_type_name=activity.entity_type.display_name if activity.entity_type else None,
        action_type_id=activity.action_type_id,
        action_type_name=activity.action_type.display_name if activity.action_type else None,
        quantity=activity.quantity,
        activity_date=activity.activity_date,
        notes=activity.notes,
        source_text=activity.source_text,
        created_at=activity.created_at,
    )


@router.post("/bulk", response_model=List[ActivityResponse], status_code=201)
def create_activities_bulk(
    data: BulkActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create multiple activities at once (from AI parsing)."""
    activities = activity_service.create_activities_bulk(db, data.activities)
    return [
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
        for a in activities
    ]


@router.delete("/{activity_id}")
def delete_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete activity."""
    if not activity_service.delete_activity(db, activity_id):
        raise HTTPException(status_code=404, detail="النشاط غير موجود")
    return {"message": "تم حذف النشاط بنجاح"}
