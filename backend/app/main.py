import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import text
from app.db import engine
from app.api.reference import router as reference_router
from app.api.events import router as events_router
from app.api.payment_methods import router as payment_methods_router
from app.api.credits import router as credits_router
from app.api.publish import router as publish_router

app = FastAPI(title="Events Ledger", version="0.1.0")

_cors_origins = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:4321,http://127.0.0.1:4321",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reference_router, prefix="/api")
app.include_router(events_router, prefix="/api")
app.include_router(payment_methods_router)
app.include_router(credits_router)
app.include_router(publish_router)


@app.get("/health")
def health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok"}
