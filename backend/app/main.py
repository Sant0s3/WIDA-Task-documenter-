"""
WIDA AI Workforce Manager FastAPI Entry Point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import CORS_ORIGINS, DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD
from app.database.database import init_db, SessionLocal
from app.models.models import User, EntityType, ActionType
from app.services.auth_utils import hash_password
from app.api import auth, employees, tasks, activities, reports, dashboard, ai, settings

app = FastAPI(
    title="WIDA AI Workforce Manager API",
    description="Internal task coordinator and AI activities tracker system",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(tasks.router)
app.include_router(activities.router)
app.include_router(reports.router)
app.include_router(dashboard.router)
app.include_router(ai.router)
app.include_router(settings.router)


@app.on_event("startup")
def startup_event():
    """Initialize database, default admin user, and seed lookup tables."""
    init_db()
    db: Session = SessionLocal()
    try:
        # 1. Create default admin if not exists
        admin = db.query(User).filter(User.username == DEFAULT_ADMIN_USERNAME).first()
        if not admin:
            admin_user = User(
                username=DEFAULT_ADMIN_USERNAME,
                password_hash=hash_password(DEFAULT_ADMIN_PASSWORD)
            )
            db.add(admin_user)
            db.commit()

        # 2. Seed default entity types
        entities = [
            ("design", "تصميم"),
            ("banner", "بانر"),
            ("image", "صورة"),
            ("video", "فيديو"),
            ("animation", "تحريك"),
            ("thumbnail", "صورة مصغرة"),
            ("social_media", "منشور شبكات اجتماعية"),
            ("presentation", "عرض تقديمي"),
            ("logo", "شعار")
        ]
        for name, dname in entities:
            existing = db.query(EntityType).filter(EntityType.name == name).first()
            if not existing:
                db.add(EntityType(name=name, display_name=dname))

        # 3. Seed default action types
        actions = [
            ("created", "إنشاء"),
            ("edited", "تعديل"),
            ("reviewed", "مراجعة"),
            ("revised", "تعديل إضافي"),
            ("animated", "تحريك"),
            ("completed", "إنجاز")
        ]
        for name, dname in actions:
            existing = db.query(ActionType).filter(ActionType.name == name).first()
            if not existing:
                db.add(ActionType(name=name, display_name=dname))

        db.commit()
    finally:
        db.close()


@app.get("/")
def read_root():
    return {"status": "ok", "app": "WIDA AI Workforce Manager Backend"}
