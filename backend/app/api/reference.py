"""CRUD routers for reference entities: Person, Ensemble, Venue, VenueOperator,
Festival, Work, MusicalPiece, Production."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db import get_session
from app.models import (
    Person, Ensemble, Venue, VenueOperator, Festival,
    Work, MusicalPiece, Production,
)
from app.schemas.reference import (
    PersonCreate, PersonRead, PersonUpdate,
    EnsembleCreate, EnsembleRead, EnsembleUpdate,
    VenueCreate, VenueRead, VenueUpdate,
    VenueOperatorCreate, VenueOperatorRead, VenueOperatorUpdate,
    FestivalCreate, FestivalRead, FestivalUpdate,
    WorkCreate, WorkRead, WorkUpdate,
    MusicalPieceCreate, MusicalPieceRead, MusicalPieceUpdate,
    ProductionCreate, ProductionRead, ProductionUpdate,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Persons
# ---------------------------------------------------------------------------

@router.get("/persons", response_model=List[PersonRead])
def list_persons(
    q: Optional[str] = None,
    role: Optional[str] = None,
    session: Session = Depends(get_session),
):
    stmt = select(Person).order_by(Person.name)
    if q:
        stmt = stmt.where(Person.name.ilike(f"%{q}%"))
    return session.exec(stmt).all()


@router.get("/persons/{person_id}", response_model=PersonRead)
def get_person(person_id: str, session: Session = Depends(get_session)):
    person = session.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    return person


@router.post("/persons", response_model=PersonRead, status_code=201)
def create_person(data: PersonCreate, session: Session = Depends(get_session)):
    person = Person(**data.model_dump())
    session.add(person)
    session.commit()
    session.refresh(person)
    return person


@router.patch("/persons/{person_id}", response_model=PersonRead)
def update_person(person_id: str, data: PersonUpdate, session: Session = Depends(get_session)):
    person = session.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(person, field, value)
    session.add(person)
    session.commit()
    session.refresh(person)
    return person


# ---------------------------------------------------------------------------
# Ensembles
# ---------------------------------------------------------------------------

@router.get("/ensembles", response_model=List[EnsembleRead])
def list_ensembles(
    q: Optional[str] = None,
    type: Optional[str] = None,
    session: Session = Depends(get_session),
):
    stmt = select(Ensemble).order_by(Ensemble.name)
    if q:
        stmt = stmt.where(Ensemble.name.ilike(f"%{q}%"))
    if type:
        stmt = stmt.where(Ensemble.type == type)
    return session.exec(stmt).all()


@router.get("/ensembles/{ensemble_id}", response_model=EnsembleRead)
def get_ensemble(ensemble_id: str, session: Session = Depends(get_session)):
    ensemble = session.get(Ensemble, ensemble_id)
    if not ensemble:
        raise HTTPException(status_code=404, detail="Ensemble not found")
    return ensemble


@router.post("/ensembles", response_model=EnsembleRead, status_code=201)
def create_ensemble(data: EnsembleCreate, session: Session = Depends(get_session)):
    ensemble = Ensemble(**data.model_dump())
    session.add(ensemble)
    session.commit()
    session.refresh(ensemble)
    return ensemble


@router.patch("/ensembles/{ensemble_id}", response_model=EnsembleRead)
def update_ensemble(ensemble_id: str, data: EnsembleUpdate, session: Session = Depends(get_session)):
    ensemble = session.get(Ensemble, ensemble_id)
    if not ensemble:
        raise HTTPException(status_code=404, detail="Ensemble not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(ensemble, field, value)
    session.add(ensemble)
    session.commit()
    session.refresh(ensemble)
    return ensemble


# ---------------------------------------------------------------------------
# VenueOperators
# ---------------------------------------------------------------------------

@router.get("/venue-operators", response_model=List[VenueOperatorRead])
def list_venue_operators(session: Session = Depends(get_session)):
    return session.exec(select(VenueOperator).order_by(VenueOperator.name)).all()


@router.get("/venue-operators/{vop_id}", response_model=VenueOperatorRead)
def get_venue_operator(vop_id: str, session: Session = Depends(get_session)):
    vop = session.get(VenueOperator, vop_id)
    if not vop:
        raise HTTPException(status_code=404, detail="VenueOperator not found")
    return vop


@router.post("/venue-operators", response_model=VenueOperatorRead, status_code=201)
def create_venue_operator(data: VenueOperatorCreate, session: Session = Depends(get_session)):
    vop = VenueOperator(**data.model_dump())
    session.add(vop)
    session.commit()
    session.refresh(vop)
    return vop


@router.patch("/venue-operators/{vop_id}", response_model=VenueOperatorRead)
def update_venue_operator(vop_id: str, data: VenueOperatorUpdate, session: Session = Depends(get_session)):
    vop = session.get(VenueOperator, vop_id)
    if not vop:
        raise HTTPException(status_code=404, detail="VenueOperator not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(vop, field, value)
    session.add(vop)
    session.commit()
    session.refresh(vop)
    return vop


# ---------------------------------------------------------------------------
# Venues
# ---------------------------------------------------------------------------

@router.get("/venues", response_model=List[VenueRead])
def list_venues(
    q: Optional[str] = None,
    city: Optional[str] = None,
    session: Session = Depends(get_session),
):
    stmt = select(Venue).order_by(Venue.name)
    if q:
        stmt = stmt.where(Venue.name.ilike(f"%{q}%"))
    if city:
        stmt = stmt.where(Venue.city.ilike(f"%{city}%"))
    return session.exec(stmt).all()


@router.get("/venues/{venue_id}", response_model=VenueRead)
def get_venue(venue_id: str, session: Session = Depends(get_session)):
    venue = session.get(Venue, venue_id)
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    return venue


@router.post("/venues", response_model=VenueRead, status_code=201)
def create_venue(data: VenueCreate, session: Session = Depends(get_session)):
    venue = Venue(**data.model_dump())
    session.add(venue)
    session.commit()
    session.refresh(venue)
    return venue


@router.patch("/venues/{venue_id}", response_model=VenueRead)
def update_venue(venue_id: str, data: VenueUpdate, session: Session = Depends(get_session)):
    venue = session.get(Venue, venue_id)
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(venue, field, value)
    session.add(venue)
    session.commit()
    session.refresh(venue)
    return venue


# ---------------------------------------------------------------------------
# Festivals
# ---------------------------------------------------------------------------

@router.get("/festivals", response_model=List[FestivalRead])
def list_festivals(session: Session = Depends(get_session)):
    return session.exec(select(Festival).order_by(Festival.name, Festival.edition)).all()


@router.get("/festivals/{festival_id}", response_model=FestivalRead)
def get_festival(festival_id: str, session: Session = Depends(get_session)):
    festival = session.get(Festival, festival_id)
    if not festival:
        raise HTTPException(status_code=404, detail="Festival not found")
    return festival


@router.post("/festivals", response_model=FestivalRead, status_code=201)
def create_festival(data: FestivalCreate, session: Session = Depends(get_session)):
    festival = Festival(**data.model_dump())
    session.add(festival)
    session.commit()
    session.refresh(festival)
    return festival


@router.patch("/festivals/{festival_id}", response_model=FestivalRead)
def update_festival(festival_id: str, data: FestivalUpdate, session: Session = Depends(get_session)):
    festival = session.get(Festival, festival_id)
    if not festival:
        raise HTTPException(status_code=404, detail="Festival not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(festival, field, value)
    session.add(festival)
    session.commit()
    session.refresh(festival)
    return festival


# ---------------------------------------------------------------------------
# Works
# ---------------------------------------------------------------------------

@router.get("/works", response_model=List[WorkRead])
def list_works(
    q: Optional[str] = None,
    type: Optional[str] = None,
    session: Session = Depends(get_session),
):
    stmt = select(Work).order_by(Work.title)
    if q:
        stmt = stmt.where(Work.title.ilike(f"%{q}%"))
    if type:
        stmt = stmt.where(Work.type == type)
    return session.exec(stmt).all()


@router.get("/works/{work_id}", response_model=WorkRead)
def get_work(work_id: str, session: Session = Depends(get_session)):
    work = session.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    return work


@router.post("/works", response_model=WorkRead, status_code=201)
def create_work(data: WorkCreate, session: Session = Depends(get_session)):
    work = Work(**data.model_dump())
    session.add(work)
    session.commit()
    session.refresh(work)
    return work


@router.patch("/works/{work_id}", response_model=WorkRead)
def update_work(work_id: str, data: WorkUpdate, session: Session = Depends(get_session)):
    work = session.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(work, field, value)
    session.add(work)
    session.commit()
    session.refresh(work)
    return work


# ---------------------------------------------------------------------------
# MusicalPieces
# ---------------------------------------------------------------------------

@router.get("/musical-pieces", response_model=List[MusicalPieceRead])
def list_musical_pieces(
    q: Optional[str] = None,
    composer_id: Optional[str] = None,
    session: Session = Depends(get_session),
):
    stmt = select(MusicalPiece).order_by(MusicalPiece.title)
    if q:
        stmt = stmt.where(MusicalPiece.title.ilike(f"%{q}%"))
    if composer_id:
        stmt = stmt.where(MusicalPiece.composer_id == composer_id)
    return session.exec(stmt).all()


@router.get("/musical-pieces/{piece_id}", response_model=MusicalPieceRead)
def get_musical_piece(piece_id: str, session: Session = Depends(get_session)):
    piece = session.get(MusicalPiece, piece_id)
    if not piece:
        raise HTTPException(status_code=404, detail="MusicalPiece not found")
    return piece


@router.post("/musical-pieces", response_model=MusicalPieceRead, status_code=201)
def create_musical_piece(data: MusicalPieceCreate, session: Session = Depends(get_session)):
    piece = MusicalPiece(**data.model_dump())
    session.add(piece)
    session.commit()
    session.refresh(piece)
    return piece


@router.patch("/musical-pieces/{piece_id}", response_model=MusicalPieceRead)
def update_musical_piece(piece_id: str, data: MusicalPieceUpdate, session: Session = Depends(get_session)):
    piece = session.get(MusicalPiece, piece_id)
    if not piece:
        raise HTTPException(status_code=404, detail="MusicalPiece not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(piece, field, value)
    session.add(piece)
    session.commit()
    session.refresh(piece)
    return piece


# ---------------------------------------------------------------------------
# Productions
# ---------------------------------------------------------------------------

@router.get("/productions", response_model=List[ProductionRead])
def list_productions(
    work_id: Optional[str] = None,
    session: Session = Depends(get_session),
):
    stmt = select(Production).order_by(Production.title)
    if work_id:
        stmt = stmt.where(Production.work_id == work_id)
    return session.exec(stmt).all()


@router.get("/productions/{production_id}", response_model=ProductionRead)
def get_production(production_id: str, session: Session = Depends(get_session)):
    production = session.get(Production, production_id)
    if not production:
        raise HTTPException(status_code=404, detail="Production not found")
    return production


@router.post("/productions", response_model=ProductionRead, status_code=201)
def create_production(data: ProductionCreate, session: Session = Depends(get_session)):
    production = Production(**data.model_dump())
    session.add(production)
    session.commit()
    session.refresh(production)
    return production


@router.patch("/productions/{production_id}", response_model=ProductionRead)
def update_production(production_id: str, data: ProductionUpdate, session: Session = Depends(get_session)):
    production = session.get(Production, production_id)
    if not production:
        raise HTTPException(status_code=404, detail="Production not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(production, field, value)
    session.add(production)
    session.commit()
    session.refresh(production)
    return production
