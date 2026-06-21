"""JWT auth — two roles: admin (full access) and guest (read-only)."""
import os
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import Request
from fastapi.responses import JSONResponse

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-please-change")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin")
GUEST_PASSWORD = os.environ.get("GUEST_PASSWORD", "guest")

WRITE_METHODS = {"POST", "PATCH", "PUT", "DELETE"}
PUBLIC_PATHS = {"/api/auth/login", "/health"}


def create_token(role: str) -> str:
    payload = {
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=90),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        return None


async def auth_middleware(request: Request, call_next):
    if request.url.path in PUBLIC_PATHS:
        return await call_next(request)

    auth = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ").strip() if auth.startswith("Bearer ") else None
    payload = decode_token(token) if token else None

    if not payload:
        return JSONResponse(status_code=401, content={"detail": "Not authenticated"})

    role = payload.get("role")
    if request.method in WRITE_METHODS and role != "admin":
        return JSONResponse(status_code=403, content={"detail": "Admin access required"})

    request.state.role = role
    return await call_next(request)
