"""
Activity service — CRUD + bulk insert.
"""
from typing import List, Optional
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import DailyActivity
from app.schemas.schemas import ActivityCreate


def get_activities(
    db: Session,
    employee_id: Optional[int] = None,
    entity_type_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 100,
) -> List[DailyActivity]:
    query = db.query(DailyActivity)
    if employee_id:
        query = query.filter(DailyActivity.employee_id == employee_id)
    if entity_type_id:
        query = query.filter(DailyActivity.entity_type_id == entity_type_id)
    if start_date:
        query = query.filter(DailyActivity.activity_date >= start_date)
    if end_date:
        query = query.filter(DailyActivity.activity_date <= end_date)
    return query.order_by(DailyActivity.created_at.desc()).limit(limit).all()


def get_activity(db: Session, activity_id: int) -> Optional[DailyActivity]:
    return db.query(DailyActivity).filter(DailyActivity.id == activity_id).first()


def create_activity(db: Session, data: ActivityCreate) -> DailyActivity:
    activity = DailyActivity(
        employee_id=data.employee_id,
        task_id=data.task_id,
        entity_type_id=data.entity_type_id,
        action_type_id=data.action_type_id,
        quantity=data.quantity,
        unit=data.unit or "items",
        activity_date=data.activity_date or date.today(),
        notes=data.notes,
        source_text=data.source_text,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


def create_activities_bulk(db: Session, activities: List[ActivityCreate]) -> List[DailyActivity]:
    """Create multiple activities at once (from AI parsing), auto-creating missing employees if needed."""
    from app.services import employee_service
    created = []
    for data in activities:
        emp_id = data.employee_id
        if not emp_id and data.employee_name:
            emp = employee_service.find_employee_by_name(db, data.employee_name)
            if not emp:
                role = "designer"
                if data.unit in ["seconds", "minutes"]:
                    role = "animator"
                if data.entity_type_id:
                    ent = db.query(EntityType).filter(EntityType.id == data.entity_type_id).first()
                    if ent and ent.name in ["video", "animation"]:
                        role = "animator"
                emp = employee_service.create_employee(db, name=data.employee_name, role=role)
            emp_id = emp.id

        if not emp_id or not data.entity_type_id or not data.action_type_id:
            continue

        activity = DailyActivity(
            employee_id=emp_id,
            task_id=data.task_id,
            entity_type_id=data.entity_type_id,
            action_type_id=data.action_type_id,
            quantity=data.quantity,
            unit=data.unit or "items",
            activity_date=data.activity_date or date.today(),
            notes=data.notes,
            source_text=data.source_text,
        )
        db.add(activity)
        created.append(activity)
    db.commit()
    for a in created:
        db.refresh(a)
    return created


def delete_activity(db: Session, activity_id: int) -> bool:
    activity = get_activity(db, activity_id)
    if not activity:
        return False
    db.delete(activity)
    db.commit()
    return True
