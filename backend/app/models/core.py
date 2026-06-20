from typing import Optional, List
from datetime import date
from datetime import time as time_type
from datetime import datetime
from decimal import Decimal
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import Time, ARRAY
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
import uuid


class VenueOperator(SQLModel, table=True):
    __tablename__ = "venue_operator"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    website_url: Optional[str] = None
    wikipedia_url: Optional[str] = None


class Venue(SQLModel, table=True):
    __tablename__ = "venue"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    parent_id: Optional[uuid.UUID] = Field(default=None, foreign_key="venue.id")
    operator_id: Optional[uuid.UUID] = Field(default=None, foreign_key="venue_operator.id")
    city: Optional[str] = None
    country: Optional[str] = None
    # theatre / concert_hall / arena / gallery / pub / outdoor / circus_tent / other
    venue_type: Optional[str] = None
    capacity: Optional[int] = None
    website_url: Optional[str] = None
    maps_url: Optional[str] = None


class Festival(SQLModel, table=True):
    __tablename__ = "festival"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    edition: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    city: Optional[str] = None
    website_url: Optional[str] = None
    notes: Optional[str] = None


class PaymentMethod(SQLModel, table=True):
    __tablename__ = "payment_method"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str  # e.g. "Museumkaart 2026-2027", "Lowlands 2026 Weekend"
    total_cost: Decimal
    currency: str = "EUR"
    purchase_date: date  # determines which year this appears in stats
    notes: Optional[str] = None


class Event(SQLModel, table=True):
    __tablename__ = "event"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    date: date
    time: Optional[time_type] = Field(default=None, sa_column=Column(Time, nullable=True))
    venue_id: uuid.UUID = Field(foreign_key="venue.id")
    # music / classical / opera / ballet / dance / circus / theatre / cabaret /
    # comedy / spoken_word / talk / exhibition / screening / other
    type: str
    subtype: Optional[str] = None  # free-text; mainly used for `other` type
    title: str
    work_id: Optional[uuid.UUID] = Field(default=None, foreign_key="work.id")
    price_paid: Optional[Decimal] = None
    currency: Optional[str] = None  # ISO 4217, e.g. GBP, EUR
    rating: Optional[float] = None
    notes: Optional[str] = None
    festival_id: Optional[uuid.UUID] = Field(default=None, foreign_key="festival.id")
    payment_method_id: Optional[uuid.UUID] = Field(default=None, foreign_key="payment_method.id")
    review: Optional[str] = None
    links: Optional[List[dict]] = Field(default=None, sa_column=Column(JSONB))
    # complete / partial / stub
    data_completeness: Optional[str] = None
    # attended / planned / cancelled
    status: str = Field(default="attended")
    related_event_ids: Optional[List[uuid.UUID]] = Field(default=None, sa_column=Column(ARRAY(PG_UUID(as_uuid=True))))
    created_at: datetime = Field(default_factory=datetime.utcnow)
