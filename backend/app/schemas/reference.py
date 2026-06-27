"""Schemas for reference entities: Person, Ensemble, Venue, VenueOperator, Festival,
Work, MusicalPiece, Production."""
from typing import Optional, List
from decimal import Decimal
from datetime import date
from pydantic import BaseModel
import uuid


# ---------------------------------------------------------------------------
# Shared
# ---------------------------------------------------------------------------

class NamedRef(BaseModel):
    """Minimal resolved reference — id + name."""
    id: uuid.UUID
    name: str


# ---------------------------------------------------------------------------
# VenueOperator
# ---------------------------------------------------------------------------

class VenueOperatorCreate(BaseModel):
    name: str
    website_url: Optional[str] = None
    wikipedia_url: Optional[str] = None


class VenueOperatorRead(VenueOperatorCreate):
    id: uuid.UUID
    model_config = {"from_attributes": True}


class VenueOperatorUpdate(BaseModel):
    name: Optional[str] = None
    website_url: Optional[str] = None
    wikipedia_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Venue
# ---------------------------------------------------------------------------

class VenueCreate(BaseModel):
    name: str
    parent_id: Optional[uuid.UUID] = None
    operator_id: Optional[uuid.UUID] = None
    city: Optional[str] = None
    country: Optional[str] = None
    venue_type: Optional[str] = None
    capacity: Optional[int] = None
    website_url: Optional[str] = None
    maps_url: Optional[str] = None


class VenueRead(VenueCreate):
    id: uuid.UUID
    parent_name: Optional[str] = None
    model_config = {"from_attributes": True}


class VenueReadEnriched(BaseModel):
    """Venue with parent and operator resolved to names."""
    id: uuid.UUID
    name: str
    parent: Optional[NamedRef] = None
    operator: Optional[NamedRef] = None
    city: Optional[str] = None
    country: Optional[str] = None
    venue_type: Optional[str] = None
    capacity: Optional[int] = None
    website_url: Optional[str] = None
    maps_url: Optional[str] = None
    model_config = {"from_attributes": True}


class VenueUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None
    operator_id: Optional[uuid.UUID] = None
    city: Optional[str] = None
    country: Optional[str] = None
    venue_type: Optional[str] = None
    capacity: Optional[int] = None
    website_url: Optional[str] = None
    maps_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Festival
# ---------------------------------------------------------------------------

class FestivalCreate(BaseModel):
    name: str
    edition: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    city: Optional[str] = None
    website_url: Optional[str] = None
    notes: Optional[str] = None


class FestivalRead(FestivalCreate):
    id: uuid.UUID
    model_config = {"from_attributes": True}


class FestivalUpdate(BaseModel):
    name: Optional[str] = None
    edition: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    city: Optional[str] = None
    website_url: Optional[str] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Person
# ---------------------------------------------------------------------------

class PersonCreate(BaseModel):
    name: str
    roles: Optional[List[str]] = None
    website_url: Optional[str] = None
    musicbrainz_url: Optional[str] = None
    notes: Optional[str] = None


class PersonRead(PersonCreate):
    id: uuid.UUID
    model_config = {"from_attributes": True}


class PersonUpdate(BaseModel):
    name: Optional[str] = None
    roles: Optional[List[str]] = None
    website_url: Optional[str] = None
    musicbrainz_url: Optional[str] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Ensemble
# ---------------------------------------------------------------------------

class EnsembleCreate(BaseModel):
    name: str
    type: Optional[str] = None
    website_url: Optional[str] = None
    musicbrainz_url: Optional[str] = None
    notes: Optional[str] = None


class EnsembleRead(EnsembleCreate):
    id: uuid.UUID
    model_config = {"from_attributes": True}


class EnsembleUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    website_url: Optional[str] = None
    musicbrainz_url: Optional[str] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Work
# ---------------------------------------------------------------------------

class WorkCreate(BaseModel):
    title: str
    type: str
    creator_id: Optional[uuid.UUID] = None
    year: Optional[int] = None
    musicbrainz_url: Optional[str] = None
    notes: Optional[str] = None


class WorkRead(WorkCreate):
    id: uuid.UUID
    model_config = {"from_attributes": True}


class WorkUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    creator_id: Optional[uuid.UUID] = None
    year: Optional[int] = None
    musicbrainz_url: Optional[str] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# MusicalPiece
# ---------------------------------------------------------------------------

class MusicalPieceCreate(BaseModel):
    title: str
    movement: Optional[str] = None
    composer_id: Optional[uuid.UUID] = None
    composer_text: Optional[str] = None
    arranger_id: Optional[uuid.UUID] = None
    original_work_id: Optional[uuid.UUID] = None
    year: Optional[int] = None
    catalogue_number: Optional[str] = None
    musicbrainz_url: Optional[str] = None
    notes: Optional[str] = None


class MusicalPieceRead(MusicalPieceCreate):
    id: uuid.UUID
    model_config = {"from_attributes": True}


class MusicalPieceUpdate(BaseModel):
    title: Optional[str] = None
    movement: Optional[str] = None
    composer_id: Optional[uuid.UUID] = None
    composer_text: Optional[str] = None
    arranger_id: Optional[uuid.UUID] = None
    original_work_id: Optional[uuid.UUID] = None
    year: Optional[int] = None
    catalogue_number: Optional[str] = None
    musicbrainz_url: Optional[str] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Production
# ---------------------------------------------------------------------------

class ProductionCreate(BaseModel):
    work_id: uuid.UUID
    title: str
    director_id: Optional[uuid.UUID] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    notes: Optional[str] = None


class ProductionRead(ProductionCreate):
    id: uuid.UUID
    model_config = {"from_attributes": True}


class ProductionUpdate(BaseModel):
    work_id: Optional[uuid.UUID] = None
    title: Optional[str] = None
    director_id: Optional[uuid.UUID] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    notes: Optional[str] = None
