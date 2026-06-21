from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.auth import create_token, ADMIN_PASSWORD, GUEST_PASSWORD

router = APIRouter()


class LoginRequest(BaseModel):
    password: str


class LoginResponse(BaseModel):
    token: str
    role: str


@router.post("/api/auth/login", response_model=LoginResponse)
def login(data: LoginRequest):
    if data.password == ADMIN_PASSWORD:
        return LoginResponse(token=create_token("admin"), role="admin")
    if data.password == GUEST_PASSWORD:
        return LoginResponse(token=create_token("guest"), role="guest")
    raise HTTPException(status_code=401, detail="Invalid password")
