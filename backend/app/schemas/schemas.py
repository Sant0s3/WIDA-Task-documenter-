"""
Pydantic schemas for request/response validation.
"""
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ─── Auth ────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class UserResponse(BaseModel):
    id: int
    username: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Employee ────────────────────────────────────────────
class EmployeeCreate(BaseModel):
    name: str
    role: str = "designer"

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    active: Optional[bool] = None

class EmployeeResponse(BaseModel):
    id: int
    name: str
    role: str
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class EmployeeWithStats(EmployeeResponse):
    total_activities: int = 0
    total_tasks: int = 0
    completed_tasks: int = 0
    this_week_activities: int = 0


# ─── Entity Type ─────────────────────────────────────────
class EntityTypeCreate(BaseModel):
    name: str
    display_name: str

class EntityTypeResponse(BaseModel):
    id: int
    name: str
    display_name: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Action Type ─────────────────────────────────────────
class ActionTypeCreate(BaseModel):
    name: str
    display_name: str

class ActionTypeResponse(BaseModel):
    id: int
    name: str
    display_name: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Task ────────────────────────────────────────────────
class TaskCreate(BaseModel):
    title: str
    employee_id: Optional[int] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    status: str = "not_started"
    progress: int = 0
    expected_duration: Optional[str] = None
    notes: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    employee_id: Optional[int] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    expected_duration: Optional[str] = None
    notes: Optional[str] = None

class TaskResponse(BaseModel):
    id: int
    title: str
    employee_id: Optional[int]
    employee_name: Optional[str] = None
    start_date: Optional[date]
    due_date: Optional[date]
    status: str
    progress: int
    expected_duration: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TaskWithAnalytics(TaskResponse):
    days_elapsed: Optional[int] = None
    days_remaining: Optional[int] = None
    is_overdue: bool = False
    risk_level: str = "on_track"  # on_track, at_risk, overdue


# ─── Daily Activity ──────────────────────────────────────
class ActivityCreate(BaseModel):
    employee_id: Optional[int] = None
    employee_name: Optional[str] = None
    task_id: Optional[int] = None
    entity_type_id: int
    action_type_id: int
    quantity: int = 1
    activity_date: Optional[date] = None
    notes: Optional[str] = None
    source_text: Optional[str] = None

class ActivityResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    task_id: Optional[int]
    entity_type_id: int
    entity_type_name: Optional[str] = None
    action_type_id: int
    action_type_name: Optional[str] = None
    quantity: int
    activity_date: date
    notes: Optional[str]
    source_text: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class BulkActivityCreate(BaseModel):
    activities: List[ActivityCreate]


# ─── AI Parser ───────────────────────────────────────────
class AIParseRequest(BaseModel):
    text: str

class ParsedActivity(BaseModel):
    employee_name: str
    employee_id: Optional[int] = None
    entity: str
    entity_id: Optional[int] = None
    action: str
    action_id: Optional[int] = None
    quantity: int = 1

class AIParseResponse(BaseModel):
    success: bool
    activities: List[ParsedActivity] = []
    needs_confirmation: bool = False
    confirmation_message: Optional[str] = None
    unknown_employees: List[str] = []
    unknown_entities: List[str] = []
    unknown_actions: List[str] = []
    similar_employees: dict = {}  # name -> list of similar names

class AIChatRequest(BaseModel):
    question: str

class AIChatResponse(BaseModel):
    answer: str
    data: Optional[dict] = None
    sql_used: Optional[str] = None


# ─── Dashboard ───────────────────────────────────────────
class DashboardStats(BaseModel):
    today_activities: int = 0
    total_activities: int = 0
    total_tasks: int = 0
    completed_tasks: int = 0
    in_progress_tasks: int = 0
    overdue_tasks: int = 0
    total_employees: int = 0
    active_employees: int = 0

class EmployeePerformance(BaseModel):
    employee_id: int
    employee_name: str
    total_activities: int
    total_quantity: int

class EntityBreakdown(BaseModel):
    entity_name: str
    total_quantity: int

class DashboardResponse(BaseModel):
    stats: DashboardStats
    employee_performance: List[EmployeePerformance] = []
    entity_breakdown: List[EntityBreakdown] = []
    recent_activities: List[ActivityResponse] = []
    activity_trend: List[dict] = []


# ─── Reports ─────────────────────────────────────────────
class ReportSummary(BaseModel):
    period: str
    total_activities: int
    total_quantity: int
    by_employee: List[dict] = []
    by_entity: List[dict] = []
    by_action: List[dict] = []
    tasks_completed: int = 0
    tasks_in_progress: int = 0
    tasks_overdue: int = 0

class ComparisonReport(BaseModel):
    current_period: ReportSummary
    previous_period: ReportSummary
    change_percentage: float = 0.0
