"""
Employee API routes.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import User
from app.schemas.schemas import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse, EmployeeWithStats
)
from app.services import employee_service
from app.services.auth_utils import get_current_user

router = APIRouter(prefix="/api/employees", tags=["Employees"])


@router.get("", response_model=List[EmployeeResponse])
def list_employees(
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all employees."""
    return employee_service.get_employees(db, active_only=active_only)


@router.get("/{employee_id}", response_model=EmployeeWithStats)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get employee with stats."""
    result = employee_service.get_employee_with_stats(db, employee_id)
    if not result:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    return result


@router.post("", response_model=EmployeeResponse, status_code=201)
def create_employee(
    data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new employee."""
    return employee_service.create_employee(db, data)


@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    data: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update employee."""
    result = employee_service.update_employee(db, employee_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    return result


@router.delete("/{employee_id}")
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft delete employee."""
    if not employee_service.delete_employee(db, employee_id):
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    return {"message": "تم حذف الموظف بنجاح"}
