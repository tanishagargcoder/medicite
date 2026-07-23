from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import create_access_token, current_user, hash_password, verify_password
from ..schemas import AuthResponse, LoginRequest, RegisterRequest, UserOut
from ..users import User, user_store

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _to_out(user: User) -> UserOut:
    return UserOut(id=user.id, email=user.email, name=user.name)


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(request: RegisterRequest) -> AuthResponse:
    if user_store.get_by_email(request.email) is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "An account with that email already exists."
        )
    user = user_store.create(
        email=request.email,
        name=request.name,
        password_hash=hash_password(request.password),
    )
    return AuthResponse(token=create_access_token(user.id), user=_to_out(user))


@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest) -> AuthResponse:
    user = user_store.get_by_email(request.email)
    # Same message either way — don't reveal whether the email is registered.
    if user is None or not verify_password(request.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")
    return AuthResponse(token=create_access_token(user.id), user=_to_out(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)) -> UserOut:
    return _to_out(user)
