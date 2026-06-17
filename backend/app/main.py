from fastapi import FastAPI
from app.db import engine
from sqlmodel import text

app = FastAPI(title="Events Ledger", version="0.1.0")


@app.get("/health")
def health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok"}
