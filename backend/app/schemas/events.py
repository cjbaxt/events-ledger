"""Event schemas — base, list, detail, and one Create schema per event type."""
from typing import Optional, List, Any
from datetime import date
from datetime import time as time_type
from decimal import Decimal
from pydantic import BaseModel
import uuid

from .reference import NamedRef


# ---------------------------------------------------------------------------
# Shared base
# ---------------------------------------------------------------------------

class EventBase(BaseModel):
    date: date
    time: Optional[time_type] = None
    venue_id: uuid.UUID
    title: str
    work_id: Optional[uuid.UUID] = None
    price_paid: Optional[Decimal] = None
    currency: Optional[str] = None
    rating: Optional[int] = None
    notes: Optional[str] = None
    festival_id: Optional[uuid.UUID] = None
    substack_url: Optional[str] = None
    data_completeness: Optional[str] = None
    status: str = "attended"


class EventUpdate(BaseModel):
    """Partial update of base Event fields."""
    date: Optional[date] = None
    time: Optional[time_type] = None
    venue_id: Optional[uuid.UUID] = None
    title: Optional[str] = None
    work_id: Optional[uuid.UUID] = None
    price_paid: Optional[Decimal] = None
    currency: Optional[str] = None
    rating: Optional[int] = None
    notes: Optional[str] = None
    festival_id: Optional[uuid.UUID] = None
    substack_url: Optional[str] = None
    data_completeness: Optional[str] = None
    status: Optional[str] = None


# ---------------------------------------------------------------------------
# List response — lightweight, enough for a list/table view
# ---------------------------------------------------------------------------

class EventListItem(BaseModel):
    id: uuid.UUID
    date: date
    time: Optional[time_type] = None
    type: str
    subtype: Optional[str] = None
    title: str
    venue_id: uuid.UUID
    venue_name: str
    festival_id: Optional[uuid.UUID] = None
    festival_name: Optional[str] = None
    price_paid: Optional[Decimal] = None
    currency: Optional[str] = None
    rating: Optional[int] = None
    data_completeness: Optional[str] = None
    substack_url: Optional[str] = None
    status: str = "attended"
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Detail response — full event with resolved extension
# ---------------------------------------------------------------------------

class EventDetail(BaseModel):
    id: uuid.UUID
    date: date
    time: Optional[time_type] = None
    type: str
    subtype: Optional[str] = None
    title: str
    venue: NamedRef
    venue_parent: Optional[NamedRef] = None
    work_id: Optional[uuid.UUID] = None
    festival: Optional[NamedRef] = None
    price_paid: Optional[Decimal] = None
    currency: Optional[str] = None
    rating: Optional[int] = None
    notes: Optional[str] = None
    substack_url: Optional[str] = None
    data_completeness: Optional[str] = None
    status: str = "attended"
    extension: Optional[dict] = None
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Create schemas — one per event type
# ---------------------------------------------------------------------------

class EventMusicCreate(EventBase):
    subtype: Optional[str] = None  # gig / open_mic / residency / other
    headliner_person_id: Optional[uuid.UUID] = None
    headliner_ensemble_id: Optional[uuid.UUID] = None
    support_act_person_ids: Optional[List[uuid.UUID]] = None
    support_act_ensemble_ids: Optional[List[uuid.UUID]] = None
    tour_name: Optional[str] = None
    setlist: Optional[List[str]] = None
    setlist_fm_url: Optional[str] = None


class ClassicalProgrammeItemCreate(BaseModel):
    musical_piece_id: uuid.UUID
    soloists: Optional[List[uuid.UUID]] = None
    order: Optional[int] = None
    notes: Optional[str] = None


class EventClassicalCreate(EventBase):
    subtype: Optional[str] = None  # orchestral / chamber / choral / recital / contemporary / other
    ensemble_id: Optional[uuid.UUID] = None
    conductor_id: Optional[uuid.UUID] = None
    notes_on_performance: Optional[str] = None
    programme: Optional[List[ClassicalProgrammeItemCreate]] = None


class EventOperaCreate(EventBase):
    subtype: Optional[str] = None  # opera / operetta / musical_theatre / other
    work_id: Optional[uuid.UUID] = None
    production_id: Optional[uuid.UUID] = None
    conductor_id: Optional[uuid.UUID] = None
    director_id: Optional[uuid.UUID] = None
    cast: Optional[dict] = None
    ensemble_id: Optional[uuid.UUID] = None
    libretto_language: Optional[str] = None
    surtitles_languages: Optional[List[str]] = None
    operabase_url: Optional[str] = None


class BalletProgrammeItemCreate(BaseModel):
    work_id: uuid.UUID
    choreographer_id: Optional[uuid.UUID] = None
    soloists: Optional[List[uuid.UUID]] = None
    order: Optional[int] = None
    musical_pieces: Optional[List[uuid.UUID]] = None  # ordered list of MusicalPiece ids


class EventBalletCreate(EventBase):
    subtype: Optional[str] = None  # full_length / mixed_bill / contemporary / other
    work_id: Optional[uuid.UUID] = None
    production_id: Optional[uuid.UUID] = None
    company_id: Optional[uuid.UUID] = None
    orchestra_id: Optional[uuid.UUID] = None
    conductor_id: Optional[uuid.UUID] = None
    cast: Optional[dict] = None
    programme: Optional[List[BalletProgrammeItemCreate]] = None


class EventDanceCreate(EventBase):
    subtype: Optional[str] = None  # contemporary / flamenco / folk / ballroom / other
    company_id: Optional[uuid.UUID] = None
    choreographer_id: Optional[uuid.UUID] = None
    work_id: Optional[uuid.UUID] = None
    programme: Optional[List[uuid.UUID]] = None
    music_notes: Optional[str] = None


class EventCircusCreate(EventBase):
    subtype: Optional[str] = None  # contemporary_circus / traditional / physical_theatre / aerial / street / other
    company_id: Optional[uuid.UUID] = None
    director_id: Optional[uuid.UUID] = None
    work_id: Optional[uuid.UUID] = None


class EventTheatreCreate(EventBase):
    subtype: Optional[str] = None  # play / musical / improv / improv_musical / panto / physical_theatre / puppet / other
    work_id: Optional[uuid.UUID] = None
    production_id: Optional[uuid.UUID] = None
    company_id: Optional[uuid.UUID] = None
    director_id: Optional[uuid.UUID] = None
    cast: Optional[dict] = None
    playwright_id: Optional[uuid.UUID] = None


class EventCabaretCreate(EventBase):
    subtype: Optional[str] = None  # burlesque / drag / cabaret / variety / other
    headliner_id: Optional[uuid.UUID] = None
    host_id: Optional[uuid.UUID] = None
    supporting_cast: Optional[List[uuid.UUID]] = None
    ensemble_id: Optional[uuid.UUID] = None
    tour_name: Optional[str] = None
    work_id: Optional[uuid.UUID] = None


class EventComedyCreate(EventBase):
    subtype: Optional[str] = None  # standup / sketch / double_act / panel / character / musical_comedy / other
    performer_id: Optional[uuid.UUID] = None
    support_acts: Optional[List[uuid.UUID]] = None
    ensemble_id: Optional[uuid.UUID] = None
    tour_name: Optional[str] = None


class EventSpokenWordCreate(EventBase):
    subtype: Optional[str] = None  # reading / slam / spoken_word / storytelling / other
    performers: Optional[List[uuid.UUID]] = None
    works_read: Optional[List[uuid.UUID]] = None
    host_id: Optional[uuid.UUID] = None


class EventTalkCreate(EventBase):
    subtype: Optional[str] = None  # lecture / panel / debate / podcast_recording / book_event / science_comm / interview / other
    speaker_ids: Optional[List[uuid.UUID]] = None
    host_id: Optional[uuid.UUID] = None
    topic: Optional[str] = None
    host_organisation: Optional[str] = None
    recording_url: Optional[str] = None


class EventExhibitionCreate(EventBase):
    subtype: Optional[str] = None  # art / natural_history / science / photography / sculpture / design / historical / other
    exhibition_title: Optional[str] = None
    artists: Optional[List[uuid.UUID]] = None
    period: Optional[str] = None
    medium: Optional[str] = None
    curator_id: Optional[uuid.UUID] = None
    permanent_or_temp: Optional[str] = None
    exhibition_url: Optional[str] = None


class EventScreeningCreate(EventBase):
    subtype: Optional[str] = None  # film / live_broadcast / archive_screening / live_score / documentary / other
    work_id: Optional[uuid.UUID] = None
    director_id: Optional[uuid.UUID] = None
    conductor_id: Optional[uuid.UUID] = None
    ensemble_id: Optional[uuid.UUID] = None
    series: Optional[str] = None


class EventOtherCreate(EventBase):
    subtype: str  # required for 'other' type
