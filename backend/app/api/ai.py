"""
AI Parser & Retrieval API routes.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import User
from app.schemas.schemas import (
    AIParseRequest, AIParseResponse,
    AIChatRequest, AIChatResponse
)
from app.ai import parser, retrieval
from app.services.auth_utils import get_current_user

router = APIRouter(prefix="/api/ai", tags=["AI"])


@router.post("/parse", response_model=AIParseResponse)
def parse_activities(
    request: AIParseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Parse daily activities description into structured tasks/activities.
    """
    return parser.parse_activity_text(db, request.text)


@router.post("/chat", response_model=AIChatResponse)
def assistant_chat(
    request: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Query database via natural language using SQL-based RAG.
    """
    return retrieval.answer_question(db, request.question)
