"""Payment method endpoints."""
from typing import List, Optional
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
import uuid

from app.db import get_session
from app.models import PaymentMethod, Event
from app.schemas.events import EventListItem
from app.api.reference import _events_to_list_items

router = APIRouter(prefix="/api/payment-methods", tags=["payment-methods"])


class PaymentMethodCreate(BaseModel):
    name: str
    total_cost: Decimal
    currency: str = "EUR"
    purchase_date: date
    notes: Optional[str] = None


class PaymentMethodRead(BaseModel):
    id: uuid.UUID
    name: str
    total_cost: Decimal
    currency: str
    purchase_date: date
    notes: Optional[str] = None
    model_config = {"from_attributes": True}


@router.get("", response_model=List[PaymentMethodRead])
def list_payment_methods(session: Session = Depends(get_session)):
    return session.exec(select(PaymentMethod).order_by(PaymentMethod.purchase_date.desc())).all()


@router.post("", response_model=PaymentMethodRead, status_code=201)
def create_payment_method(data: PaymentMethodCreate, session: Session = Depends(get_session)):
    pm = PaymentMethod(**data.model_dump())
    session.add(pm)
    session.commit()
    session.refresh(pm)
    return pm


@router.get("/{pm_id}", response_model=PaymentMethodRead)
def get_payment_method(pm_id: uuid.UUID, session: Session = Depends(get_session)):
    pm = session.get(PaymentMethod, pm_id)
    if not pm:
        raise HTTPException(status_code=404, detail="Payment method not found")
    return pm


@router.get("/{pm_id}/events", response_model=List[EventListItem])
def get_payment_method_events(pm_id: uuid.UUID, session: Session = Depends(get_session)):
    pm = session.get(PaymentMethod, pm_id)
    if not pm:
        raise HTTPException(status_code=404, detail="Payment method not found")
    events = session.exec(
        select(Event).where(Event.payment_method_id == pm_id).order_by(Event.date.desc())
    ).all()
    return _events_to_list_items(session, events)
