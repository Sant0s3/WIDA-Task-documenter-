"""
Authentication API routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import User
from app.schemas.schemas import (
    LoginRequest, LoginResponse, ChangePasswordRequest, UserResponse
)
from app.services.auth_utils import (
    verify_password, hash_password, create_access_token, get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate coordinator and return JWT token."""
    user = db.query(User).filter(User.username == request.username).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="اسم المستخدم أو كلمة المرور غير صحيحة",
        )
    token = create_access_token(data={"sub": user.username})
    return LoginResponse(
        access_token=token,
        username=user.username,
    )


@router.post("/change-password")
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change the coordinator's password."""
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="كلمة المرور الحالية غير صحيحة",
        )
    current_user.password_hash = hash_password(request.new_password)
    db.commit()
    return {"message": "تم تغيير كلمة المرور بنجاح"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info."""
    return current_user
