"""
Type-specific extension tables. Each has event_id as both primary key and FK → event.
Arrays of UUIDs are stored as Postgres ARRAY(UUID).
JSON fields (cast, setlist) are stored as JSONB.
"""
from typing import Optional, List
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import ARRAY, String, JSON
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import uuid


# ---------------------------------------------------------------------------
# Music
# ---------------------------------------------------------------------------

class EventMusic(SQLModel, table=True):
    __tablename__ = "event_music"

    event_id: uuid.UUID = Field(primary_key=True, foreign_key="event.id")
    # gig / open_mic / residency / other
    subtype: Optional[str] = None
    # Polymorphic split: exactly one of these should be set (or neither for ensemble-only)
    headliner_person_id: Optional[uuid.UUID] = Field(default=None, foreign_key="person.id")
    headliner_ensemble_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ensemble.id")
    support_act_person_ids: Optional[List[uuid.UUID]] = Field(
        default=None, sa_column=Column(ARRAY(PG_UUID(as_uuid=True)))
    )
    support_act_ensemble_ids: Optional[List[uuid.UUID]] = Field(
        default=None, sa_column=Column(ARRAY(PG_UUID(as_uuid=True)))
    )
    tour_name: Optional[str] = None
    setlist: Optional[list] = Field(default=None, sa_column=Column(JSON))
    setlist_fm_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Classical
# ---------------------------------------------------------------------------

class EventClassical(SQLModel, table=True):
    __tablename__ = "event_classical"

    event_id: uuid.UUID = Field(primary_key=True, foreign_key="event.id")
    # orchestral / chamber / choral / recital / contemporary / other
    subtype: Optional[str] = None
    ensemble_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ensemble.id")
    conductor_id: Optional[uuid.UUID] = Field(default=None, foreign_key="person.id")
    notes_on_performance: Optional[str] = None


class ClassicalProgrammeItem(SQLModel, table=True):
    __tablename__ = "classical_programme_item"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    event_id: uuid.UUID = Field(foreign_key="event.id")
    musical_piece_id: uuid.UUID = Field(foreign_key="musical_piece.id")
    soloists: Optional[List[uuid.UUID]] = Field(
        default=None, sa_column=Column(ARRAY(PG_UUID(as_uuid=True)))
    )
    order: Optional[int] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Opera
# ---------------------------------------------------------------------------

class EventOpera(SQLModel, table=True):
    __tablename__ = "event_opera"

    event_id: uuid.UUID = Field(primary_key=True, foreign_key="event.id")
    # opera / operetta / musical_theatre / other
    subtype: Optional[str] = None
    work_id: Optional[uuid.UUID] = Field(default=None, foreign_key="work.id")
    production_id: Optional[uuid.UUID] = Field(default=None, foreign_key="production.id")
    conductor_id: Optional[uuid.UUID] = Field(default=None, foreign_key="person.id")
    director_id: Optional[uuid.UUID] = Field(default=None, foreign_key="person.id")
    cast: Optional[dict] = Field(default=None, sa_column=Column(JSON))  # role → person_id (str uuid)
    ensemble_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ensemble.id")
    libretto_language: Optional[str] = None
    surtitles_languages: Optional[List[str]] = Field(
        default=None, sa_column=Column(ARRAY(String))
    )
    operabase_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Ballet
# ---------------------------------------------------------------------------

class EventBallet(SQLModel, table=True):
    __tablename__ = "event_ballet"

    event_id: uuid.UUID = Field(primary_key=True, foreign_key="event.id")
    # full_length / mixed_bill / contemporary / other
    subtype: Optional[str] = None
    work_id: Optional[uuid.UUID] = Field(default=None, foreign_key="work.id")
    production_id: Optional[uuid.UUID] = Field(default=None, foreign_key="production.id")
    company_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ensemble.id")
    orchestra_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ensemble.id")
    conductor_id: Optional[uuid.UUID] = Field(default=None, foreign_key="person.id")
    cast: Optional[dict] = Field(default=None, sa_column=Column(JSON))


class BalletProgrammeItem(SQLModel, table=True):
    __tablename__ = "ballet_programme_item"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    event_id: uuid.UUID = Field(foreign_key="event.id")
    work_id: uuid.UUID = Field(foreign_key="work.id")
    choreographer_id: Optional[uuid.UUID] = Field(default=None, foreign_key="person.id")
    soloists: Optional[List[uuid.UUID]] = Field(
        default=None, sa_column=Column(ARRAY(PG_UUID(as_uuid=True)))
    )
    order: Optional[int] = None


class BalletProgrammeMusic(SQLModel, table=True):
    __tablename__ = "ballet_programme_music"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    programme_item_id: uuid.UUID = Field(foreign_key="ballet_programme_item.id")
    musical_piece_id: uuid.UUID = Field(foreign_key="musical_piece.id")
    order: Optional[int] = None


# ---------------------------------------------------------------------------
# Dance
# ---------------------------------------------------------------------------

class EventDance(SQLModel, table=True):
    __tablename__ = "event_dance"

    event_id: uuid.UUID = Field(primary_key=True, foreign_key="event.id")
    # contemporary / flamenco / folk / ballroom / other
    subtype: Optional[str] = None
    company_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ensemble.id")
    choreographer_id: Optional[uuid.UUID] = Field(default=None, foreign_key="person.id")
    work_id: Optional[uuid.UUID] = Field(default=None, foreign_key="work.id")
    programme: Optional[list] = Field(default=None, sa_column=Column(JSON))  # array of work ids
    music_notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Circus
# ---------------------------------------------------------------------------

class EventCircus(SQLModel, table=True):
    __tablename__ = "event_circus"

    event_id: uuid.UUID = Field(primary_key=True, foreign_key="event.id")
    # contemporary_circus / traditional / physical_theatre / aerial / street / other
    subtype: Optional[str] = None
    company_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ensemble.id")
    director_id: Optional[uuid.UUID] = Field(default=None, foreign_key="person.id")
    work_id: Optional[uuid.UUID] = Field(default=None, foreign_key="work.id")


# ---------------------------------------------------------------------------
# Theatre
# ---------------------------------------------------------------------------

class EventTheatre(SQLModel, table=True):
    __tablename__ = "event_theatre"

    event_id: uuid.UUID = Field(primary_key=True, foreign_key="event.id")
    # play / musical / improv / improv_musical / panto / physical_theatre / puppet / other
    subtype: Optional[str] = None
    work_id: Optional[uuid.UUID] = Field(default=None, foreign_key="work.id")
    production_id: Optional[uuid.UUID] = Field(default=None, foreign_key="production.id")
    company_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ensemble.id")
    director_id: Optional[uuid.UUID] = Field(default=None, foreign_key="person.id")
    cast: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    playwright_id: Optional[uuid.UUID] = Field(default=None, foreign_key="person.id")


# ---------------------------------------------------------------------------
# Cabaret
# ---------------------------------------------------------------------------

class EventCabaret(SQLModel, table=True):
    __tablename__ = "event_cabaret"

    event_id: uuid.UUID = Field(primary_key=True, foreign_key="event.id")
    # burlesque / drag / cabaret / variety / other
    subtype: Optional[str] = None
    headliner_id: Optional[uuid.UUID] = Field(default=None, foreign_key="person.id")
    host_id: Optional[uuid.UUID] = Field(default=None, foreign_key="person.id")
    supporting_cast: Optional[List[uuid.UUID]] = Field(
        default=None, sa_column=Column(ARRAY(PG_UUID(as_uuid=True)))
    )
    ensemble_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ensemble.id")
    tour_name: Optional[str] = None
    work_id: Optional[uuid.UUID] = Field(default=None, foreign_key="work.id")


# ---------------------------------------------------------------------------
# Comedy
# ---------------------------------------------------------------------------

class EventComedy(SQLModel, table=True):
    __tablename__ = "event_comedy"

    event_id: uuid.UUID = Field(primary_key=True, foreign_key="event.id")
    # standup / sketch / double_act / panel / character / musical_comedy / other
    subtype: Optional[str] = None
    performer_id: Optional[uuid.UUID] = Field(default=None, foreign_key="person.id")
    support_acts: Optional[List[uuid.UUID]] = Field(
        default=None, sa_column=Column(ARRAY(PG_UUID(as_uuid=True)))
    )
    ensemble_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ensemble.id")
    tour_name: Optional[str] = None


# ---------------------------------------------------------------------------
# Spoken Word
# ---------------------------------------------------------------------------

class EventSpokenWord(SQLModel, table=True):
    __tablename__ = "event_spoken_word"

    event_id: uuid.UUID = Field(primary_key=True, foreign_key="event.id")
    # reading / slam / spoken_word / storytelling / other
    subtype: Optional[str] = None
    performers: Optional[List[uuid.UUID]] = Field(
        default=None, sa_column=Column(ARRAY(PG_UUID(as_uuid=True)))
    )
    works_read: Optional[List[uuid.UUID]] = Field(
        default=None, sa_column=Column(ARRAY(PG_UUID(as_uuid=True)))
    )
    host_id: Optional[uuid.UUID] = Field(default=None, foreign_key="person.id")


# ---------------------------------------------------------------------------
# Talk
# ---------------------------------------------------------------------------

class EventTalk(SQLModel, table=True):
    __tablename__ = "event_talk"

    event_id: uuid.UUID = Field(primary_key=True, foreign_key="event.id")
    # lecture / panel / debate / podcast_recording / book_event / science_comm / interview / other
    subtype: Optional[str] = None
    speaker_ids: Optional[List[uuid.UUID]] = Field(
        default=None, sa_column=Column(ARRAY(PG_UUID(as_uuid=True)))
    )
    host_id: Optional[uuid.UUID] = Field(default=None, foreign_key="person.id")
    topic: Optional[str] = None
    host_organisation: Optional[str] = None
    recording_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Exhibition
# ---------------------------------------------------------------------------

class EventExhibition(SQLModel, table=True):
    __tablename__ = "event_exhibition"

    event_id: uuid.UUID = Field(primary_key=True, foreign_key="event.id")
    # art / natural_history / science / photography / sculpture / design / historical / other
    subtype: Optional[str] = None
    exhibition_title: Optional[str] = None
    artists: Optional[List[uuid.UUID]] = Field(
        default=None, sa_column=Column(ARRAY(PG_UUID(as_uuid=True)))
    )
    period: Optional[str] = None
    medium: Optional[str] = None
    curator_id: Optional[uuid.UUID] = Field(default=None, foreign_key="person.id")
    # permanent / temporary / touring
    permanent_or_temp: Optional[str] = None
    exhibition_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Screening
# ---------------------------------------------------------------------------

class EventScreening(SQLModel, table=True):
    __tablename__ = "event_screening"

    event_id: uuid.UUID = Field(primary_key=True, foreign_key="event.id")
    # film / live_broadcast / archive_screening / live_score / documentary / other
    subtype: Optional[str] = None
    work_id: Optional[uuid.UUID] = Field(default=None, foreign_key="work.id")
    director_id: Optional[uuid.UUID] = Field(default=None, foreign_key="person.id")
    conductor_id: Optional[uuid.UUID] = Field(default=None, foreign_key="person.id")
    ensemble_id: Optional[uuid.UUID] = Field(default=None, foreign_key="ensemble.id")
    series: Optional[str] = None
