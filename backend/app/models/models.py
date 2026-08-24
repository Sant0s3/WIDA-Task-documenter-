"""
SQLAlchemy ORM models for WIDA Workforce Manager.
"""
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Boolean, Date, DateTime,
    Float, Text, ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import relationship
import enum

from app.database.database import Base


class TaskStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class EmployeeRole(str, enum.Enum):
    DESIGNER = "designer"
    ANIMATOR = "animator"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    role = Column(String(50), nullable=False, default=EmployeeRole.DESIGNER.value)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    tasks = relationship("Task", back_populates="employee", lazy="dynamic")
    activities = relationship("DailyActivity", back_populates="employee", lazy="dynamic")


class EntityType(Base):
    __tablename__ = "entity_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    display_name = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    activities = relationship("DailyActivity", back_populates="entity_type")


class ActionType(Base):
    __tablename__ = "action_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    display_name = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    activities = relationship("DailyActivity", back_populates="action_type")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    start_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    status = Column(String(50), default=TaskStatus.NOT_STARTED.value)
    progress = Column(Integer, default=0)  # 0-100
    expected_duration = Column(String(100), nullable=True)  # e.g., "5 days"
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    employee = relationship("Employee", back_populates="tasks")
    activities = relationship("DailyActivity", back_populates="task")


class DailyActivity(Base):
    __tablename__ = "daily_activities"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    entity_type_id = Column(Integer, ForeignKey("entity_types.id"), nullable=False)
    action_type_id = Column(Integer, ForeignKey("action_types.id"), nullable=False)
    quantity = Column(Integer, default=1)
    activity_date = Column(Date, default=date.today)
    notes = Column(Text, nullable=True)
    source_text = Column(Text, nullable=True)  # Original Arabic/English input
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    employee = relationship("Employee", back_populates="activities")
    task = relationship("Task", back_populates="activities")
    entity_type = relationship("EntityType", back_populates="activities")
    action_type = relationship("ActionType", back_populates="activities")
