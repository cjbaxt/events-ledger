from typing import Optional, List
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import ARRAY, String
import uuid


class Person(SQLModel, table=True):
    __tablename__ = "person"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    roles: Optional[List[str]] = Field(default=None, sa_column=Column(ARRAY(String)))
    website_url: Optional[str] = None
    musicbrainz_url: Optional[str] = None
    notes: Optional[str] = None


class Ensemble(SQLModel, table=True):
    __tablename__ = "ensemble"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    type: Optional[str] = None  # orchestra / band / theatre_company / dance_company / circus_company / choir / other
    website_url: Optional[str] = None
    musicbrainz_url: Optional[str] = None
    notes: Optional[str] = None
