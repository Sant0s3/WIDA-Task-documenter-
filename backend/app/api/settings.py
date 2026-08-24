"""
Settings API routes — entity types and action types management.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import User, EntityType, ActionType
from app.schemas.schemas import (
    EntityTypeCreate, EntityTypeResponse,
    ActionTypeCreate, ActionTypeResponse,
)
from app.services.auth_utils import get_current_user

router = APIRouter(prefix="/api/settings", tags=["Settings"])


# ─── Entity Types ────────────────────────────────────────
@router.get("/entity-types", response_model=List[EntityTypeResponse])
def list_entity_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(EntityType).order_by(EntityType.display_name).all()


@router.post("/entity-types", response_model=EntityTypeResponse, status_code=201)
def create_entity_type(
    data: EntityTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(EntityType).filter(EntityType.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="هذا النوع موجود بالفعل")
    entity_type = EntityType(name=data.name, display_name=data.display_name)
    db.add(entity_type)
    db.commit()
    db.refresh(entity_type)
    return entity_type


@router.delete("/entity-types/{entity_type_id}")
def delete_entity_type(
    entity_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    et = db.query(EntityType).filter(EntityType.id == entity_type_id).first()
    if not et:
        raise HTTPException(status_code=404, detail="النوع غير موجود")
    db.delete(et)
    db.commit()
    return {"message": "تم الحذف بنجاح"}


# ─── Action Types ────────────────────────────────────────
@router.get("/action-types", response_model=List[ActionTypeResponse])
def list_action_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(ActionType).order_by(ActionType.display_name).all()


@router.post("/action-types", response_model=ActionTypeResponse, status_code=201)
def create_action_type(
    data: ActionTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(ActionType).filter(ActionType.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="هذا الإجراء موجود بالفعل")
    action_type = ActionType(name=data.name, display_name=data.display_name)
    db.add(action_type)
    db.commit()
    db.refresh(action_type)
    return action_type


@router.delete("/action-types/{action_type_id}")
def delete_action_type(
    action_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    at = db.query(ActionType).filter(ActionType.id == action_type_id).first()
    if not at:
        raise HTTPException(status_code=404, detail="الإجراء غير موجود")
    db.delete(at)
    db.commit()
    return {"message": "تم الحذف بنجاح"}
