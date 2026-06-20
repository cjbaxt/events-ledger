"""CRUD for event_credit rows."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
import uuid

from app.db import get_session
from app.models import EventCredit, Person

router = APIRouter(prefix="/api/events/{event_id}/credits", tags=["credits"])


class CreditIn(BaseModel):
    role: str
    person_id: uuid.UUID
    sort_order: int = 0


class CreditOut(BaseModel):
    id: uuid.UUID
    role: str
    person: dict
    sort_order: int


@router.get("", response_model=List[CreditOut])
def list_credits(event_id: uuid.UUID, session: Session = Depends(get_session)):
    rows = session.exec(
        select(EventCredit)
        .where(EventCredit.event_id == event_id)
        .order_by(EventCredit.sort_order)
    ).all()
    result = []
    for row in rows:
        p = session.get(Person, row.person_id)
        if p:
            result.append(CreditOut(
                id=row.id, role=row.role,
                person={"id": str(p.id), "name": p.name},
                sort_order=row.sort_order,
            ))
    return result


@router.post("", response_model=CreditOut, status_code=201)
def add_credit(event_id: uuid.UUID, data: CreditIn, session: Session = Depends(get_session)):
    p = session.get(Person, data.person_id)
    if not p:
        raise HTTPException(status_code=404, detail="Person not found")
    credit = EventCredit(event_id=event_id, role=data.role, person_id=data.person_id, sort_order=data.sort_order)
    session.add(credit)
    session.commit()
    session.refresh(credit)
    return CreditOut(id=credit.id, role=credit.role, person={"id": str(p.id), "name": p.name}, sort_order=credit.sort_order)


@router.delete("/{credit_id}", status_code=204)
def delete_credit(event_id: uuid.UUID, credit_id: uuid.UUID, session: Session = Depends(get_session)):
    credit = session.get(EventCredit, credit_id)
    if not credit or credit.event_id != event_id:
        raise HTTPException(status_code=404, detail="Credit not found")
    session.delete(credit)
    session.commit()
