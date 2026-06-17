from typing import Optional
from sqlmodel import Field, SQLModel
import uuid


class Work(SQLModel, table=True):
    __tablename__ = "work"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str
    # play / opera / symphony / ballet / album / poem / film / circus_show / dance_show / spoken_word / musical / other
    type: str
    creator_id: Optional[uuid.UUID] = Field(default=None, foreign_key="person.id")
    year: Optional[int] = None
    musicbrainz_url: Optional[str] = None
    notes: Optional[str] = None


class MusicalPiece(SQLModel, table=True):
    __tablename__ = "musical_piece"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str
    movement: Optional[str] = None
    composer_id: Optional[uuid.UUID] = Field(default=None, foreign_key="person.id")
    composer_text: Optional[str] = None  # for trad/anonymous/band composers
    arranger_id: Optional[uuid.UUID] = Field(default=None, foreign_key="person.id")
    original_work_id: Optional[uuid.UUID] = Field(default=None, foreign_key="musical_piece.id")
    year: Optional[int] = None
    catalogue_number: Optional[str] = None
    musicbrainz_url: Optional[str] = None
    notes: Optional[str] = None


class Production(SQLModel, table=True):
    __tablename__ = "production"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    work_id: uuid.UUID = Field(foreign_key="work.id")
    title: str
    director_id: Optional[uuid.UUID] = Field(default=None, foreign_key="person.id")
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    notes: Optional[str] = None
