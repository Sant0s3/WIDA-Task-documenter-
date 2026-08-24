"""
Employee service — CRUD + fuzzy name matching.
"""
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import Employee, DailyActivity, Task, TaskStatus
from app.schemas.schemas import EmployeeCreate, EmployeeUpdate, EmployeeWithStats


def get_employees(db: Session, active_only: bool = True) -> List[Employee]:
    query = db.query(Employee)
    if active_only:
        query = query.filter(Employee.active == True)
    return query.order_by(Employee.name).all()


def get_employee(db: Session, employee_id: int) -> Optional[Employee]:
    return db.query(Employee).filter(Employee.id == employee_id).first()


def get_employee_with_stats(db: Session, employee_id: int) -> Optional[EmployeeWithStats]:
    employee = get_employee(db, employee_id)
    if not employee:
        return None

    now = datetime.utcnow()
    week_ago = (now - timedelta(days=7)).date()

    total_activities = db.query(func.count(DailyActivity.id)).filter(
        DailyActivity.employee_id == employee_id
    ).scalar() or 0

    total_tasks = db.query(func.count(Task.id)).filter(
        Task.employee_id == employee_id
    ).scalar() or 0

    completed_tasks = db.query(func.count(Task.id)).filter(
        Task.employee_id == employee_id,
        Task.status == TaskStatus.COMPLETED.value
    ).scalar() or 0

    this_week = db.query(func.count(DailyActivity.id)).filter(
        DailyActivity.employee_id == employee_id,
        DailyActivity.activity_date >= week_ago
    ).scalar() or 0

    return EmployeeWithStats(
        id=employee.id,
        name=employee.name,
        role=employee.role,
        active=employee.active,
        created_at=employee.created_at,
        total_activities=total_activities,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        this_week_activities=this_week,
    )


def create_employee(db: Session, data: EmployeeCreate) -> Employee:
    employee = Employee(name=data.name, role=data.role)
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


def update_employee(db: Session, employee_id: int, data: EmployeeUpdate) -> Optional[Employee]:
    employee = get_employee(db, employee_id)
    if not employee:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(employee, key, value)
    db.commit()
    db.refresh(employee)
    return employee


def delete_employee(db: Session, employee_id: int) -> bool:
    """Hard delete — remove employee and associated records from database."""
    employee = get_employee(db, employee_id)
    if not employee:
        return False
    
    # Delete associated daily activities and tasks
    db.query(DailyActivity).filter(DailyActivity.employee_id == employee_id).delete()
    db.query(Task).filter(Task.employee_id == employee_id).delete()
    
    # Delete employee record
    db.delete(employee)
    db.commit()
    return True


def normalize_arabic(text: str) -> str:
    """Normalize Arabic text for resilient fuzzy matching."""
    if not text:
        return ""
    text = text.strip().lower()
    # Remove spacing variations between compound names like عبد الرحمن vs عبدالرحمن
    text = text.replace("عبد ", "عبد")
    text = text.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
    text = text.replace("ة", "ه").replace("ى", "ي")
    # Remove diacritics
    tashkeel = ["َ", "ً", "ُ", "ٌ", "ِ", "ٍ", "ْ", "ّ"]
    for ch in tashkeel:
        text = text.replace(ch, "")
    return text


def find_employee_by_name(db: Session, name: str) -> Optional[Employee]:
    """Smart match for Arabic employee names handling spacing and hamzas."""
    if not name:
        return None
    
    clean_search = normalize_arabic(name)
    all_employees = db.query(Employee).filter(Employee.active == True).all()

    # 1. Check normalized exact match
    for emp in all_employees:
        if normalize_arabic(emp.name) == clean_search:
            return emp

    # 2. Check substring / contained match
    for emp in all_employees:
        emp_clean = normalize_arabic(emp.name)
        if clean_search in emp_clean or emp_clean in clean_search:
            return emp

    return None


def find_similar_employees(db: Session, name: str) -> List[Employee]:
    """Find employees with similar names for disambiguation."""
    clean_search = normalize_arabic(name)
    all_employees = db.query(Employee).filter(Employee.active == True).all()
    similar = []
    for emp in all_employees:
        emp_clean = normalize_arabic(emp.name)
        if clean_search in emp_clean or emp_clean in clean_search:
            similar.append(emp)
        elif _arabic_name_similarity(clean_search, emp_clean) > 0.5:
            similar.append(emp)
    return similar


def _arabic_name_similarity(name1: str, name2: str) -> float:
    """Simple similarity score for Arabic names based on shared characters."""
    if not name1 or not name2:
        return 0.0
    # Remove common prefixes/suffixes
    chars1 = set(name1.replace(" ", ""))
    chars2 = set(name2.replace(" ", ""))
    if not chars1 or not chars2:
        return 0.0
    intersection = chars1 & chars2
    union = chars1 | chars2
    return len(intersection) / len(union)
