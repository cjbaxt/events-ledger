"""CRUD routers for reference entities: Person, Ensemble, Venue, VenueOperator,
Festival, Work, MusicalPiece, Production."""
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy import text

from app.db import get_session
from app.models import (
    Person, Ensemble, Venue, VenueOperator, Festival,
    Work, MusicalPiece, Production, Event,
)
from app.schemas.events import EventListItem
from app.api.events import _venue_display
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


@router.get("/persons/{person_id}/events", response_model=List[EventListItem])
def get_person_events(person_id: str, session: Session = Depends(get_session)):
    """Return all events referencing this person, across every extension table."""
    person = session.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    try:
        pid_str = str(uuid.UUID(person_id))
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID")

    event_ids: set = set()

    def by_fk(table: str, column: str) -> None:
        rows = session.execute(
            text(f"SELECT event_id FROM {table} WHERE {column} = cast(:pid AS uuid)"),
            {"pid": pid_str},
        ).all()
        event_ids.update(r[0] for r in rows)

    def by_array(table: str, column: str) -> None:
        rows = session.execute(
            text(f"SELECT event_id FROM {table} WHERE cast(:pid AS uuid) = ANY({column})"),
            {"pid": pid_str},
        ).all()
        event_ids.update(r[0] for r in rows)

    def by_work_creator(table: str, fk_col: str = "work_id") -> None:
        """Find events where a work linked from this extension table was created by pid."""
        rows = session.execute(
            text(
                f"SELECT t.event_id FROM {table} t "
                f"JOIN work w ON w.id = t.{fk_col} "
                f"WHERE w.creator_id = cast(:pid AS uuid)"
            ),
            {"pid": pid_str},
        ).all()
        event_ids.update(r[0] for r in rows)

    def by_json_cast(table: str) -> None:
        # Match scalar values (role → uuid string) and array values (role → [uuid, ...])
        # Guard with jsonb_typeof = 'object' to skip null/array top-level values
        rows = session.execute(
            text(
                f'SELECT event_id FROM {table} WHERE "cast" IS NOT NULL AND jsonb_typeof("cast"::jsonb) = \'object\' AND ('
                f'  EXISTS (SELECT 1 FROM jsonb_each("cast"::jsonb) kv WHERE jsonb_typeof(kv.value) = \'string\' AND kv.value #>> \'{{}}\' = :pid)'
                f'  OR EXISTS (SELECT 1 FROM jsonb_each("cast"::jsonb) kv, jsonb_array_elements_text(CASE WHEN jsonb_typeof(kv.value) = \'array\' THEN kv.value ELSE \'[]\' END) v WHERE v = :pid)'
                f')'
            ),
            {"pid": pid_str},
        ).all()
        event_ids.update(r[0] for r in rows)

    by_fk("event_music", "headliner_person_id")
    by_array("event_music", "support_act_person_ids")

    by_fk("event_classical", "conductor_id")
    by_array("classical_programme_item", "soloists")
    # composer via musical_piece → classical_programme_item
    rows = session.execute(
        text(
            "SELECT cpi.event_id FROM classical_programme_item cpi "
            "JOIN musical_piece mp ON mp.id = cpi.musical_piece_id "
            "WHERE mp.composer_id = cast(:pid AS uuid)"
        ),
        {"pid": pid_str},
    ).all()
    event_ids.update(r[0] for r in rows)

    by_fk("event_opera", "conductor_id")
    by_fk("event_opera", "director_id")
    by_array("event_opera", "composers")
    by_json_cast("event_opera")
    by_work_creator("event_opera")

    by_fk("event_ballet", "conductor_id")
    by_json_cast("event_ballet")
    by_fk("ballet_programme_item", "choreographer_id")
    by_array("ballet_programme_item", "soloists")
    # composer via musical_piece → ballet_programme_music → ballet_programme_item
    rows = session.execute(
        text(
            "SELECT bpi.event_id FROM ballet_programme_item bpi "
            "JOIN ballet_programme_music bpm ON bpm.programme_item_id = bpi.id "
            "JOIN musical_piece mp ON mp.id = bpm.musical_piece_id "
            "WHERE mp.composer_id = cast(:pid AS uuid)"
        ),
        {"pid": pid_str},
    ).all()
    event_ids.update(r[0] for r in rows)

    by_fk("event_dance", "choreographer_id")
    by_work_creator("event_dance")

    by_fk("event_circus", "director_id")
    by_work_creator("event_circus")

    by_fk("event_theatre", "director_id")
    by_fk("event_theatre", "playwright_id")
    by_json_cast("event_theatre")
    by_work_creator("event_theatre")

    by_fk("event_cabaret", "headliner_id")
    by_fk("event_cabaret", "host_id")
    by_array("event_cabaret", "supporting_cast")
    by_work_creator("event_cabaret")

    by_fk("event_comedy", "performer_id")
    by_array("event_comedy", "support_acts")

    by_array("event_spoken_word", "performers")
    by_fk("event_spoken_word", "host_id")

    by_array("event_talk", "speaker_ids")
    by_fk("event_talk", "host_id")

    by_array("event_exhibition", "artists")
    by_fk("event_exhibition", "curator_id")

    by_fk("event_screening", "director_id")
    by_fk("event_screening", "conductor_id")
    by_work_creator("event_screening")

    by_fk("event_credit", "person_id")

    if not event_ids:
        return []

    events = session.exec(
        select(Event).where(Event.id.in_(event_ids)).order_by(Event.date.desc())
    ).all()

    return _events_to_list_items(session, events)


def _events_to_list_items(session: Session, events) -> List[EventListItem]:
    result = []
    for e in events:
        _, _path, venue_display = _venue_display(session, e.venue_id)
        festival = session.get(Festival, e.festival_id) if e.festival_id else None
        result.append(EventListItem(
            id=e.id,
            date=e.date,
            time=e.time,
            type=e.type,
            subtype=e.subtype,
            title=e.title,
            venue_id=e.venue_id,
            venue_name=venue_display,
            festival_id=e.festival_id,
            festival_name=f"{festival.name} {festival.edition}".strip() if festival else None,
            price_paid=e.price_paid,
            currency=e.currency,
            rating=e.rating,
            data_completeness=e.data_completeness,
            substack_url=e.substack_url,
            status=e.status,
        ))
    return result


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


@router.get("/ensembles/{ensemble_id}/events", response_model=List[EventListItem])
def get_ensemble_events(ensemble_id: str, session: Session = Depends(get_session)):
    """Return all events referencing this ensemble across all extension tables."""
    ensemble = session.get(Ensemble, ensemble_id)
    if not ensemble:
        raise HTTPException(status_code=404, detail="Ensemble not found")

    try:
        eid_str = str(uuid.UUID(ensemble_id))
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID")

    event_ids: set = set()

    def by_fk(table: str, column: str) -> None:
        rows = session.execute(
            text(f"SELECT event_id FROM {table} WHERE {column} = cast(:eid AS uuid)"),
            {"eid": eid_str},
        ).all()
        event_ids.update(r[0] for r in rows)

    def by_array(table: str, column: str) -> None:
        rows = session.execute(
            text(f"SELECT event_id FROM {table} WHERE cast(:eid AS uuid) = ANY({column})"),
            {"eid": eid_str},
        ).all()
        event_ids.update(r[0] for r in rows)

    by_fk("event_music", "headliner_ensemble_id")
    by_array("event_music", "support_act_ensemble_ids")
    by_fk("event_classical", "ensemble_id")
    by_fk("event_opera", "ensemble_id")
    by_fk("event_ballet", "company_id")
    by_fk("event_ballet", "orchestra_id")
    by_fk("event_dance", "company_id")
    by_fk("event_circus", "company_id")
    by_fk("event_theatre", "company_id")
    by_fk("event_cabaret", "ensemble_id")
    by_fk("event_comedy", "ensemble_id")
    by_fk("event_screening", "ensemble_id")

    if not event_ids:
        return []

    events = session.exec(
        select(Event).where(Event.id.in_(event_ids)).order_by(Event.date.desc())
    ).all()

    return _events_to_list_items(session, events)


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


@router.get("/venues/{venue_id}/events", response_model=List[EventListItem])
def get_venue_events(venue_id: str, session: Session = Depends(get_session)):
    """Return all events at this venue or any of its child venues."""
    venue = session.get(Venue, venue_id)
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    try:
        vid = uuid.UUID(venue_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID")

    # Collect this venue + all descendants (recursive)
    child_ids = session.execute(
        text("""
            WITH RECURSIVE descendants AS (
                SELECT id FROM venue WHERE parent_id = cast(:vid AS uuid)
                UNION ALL
                SELECT v.id FROM venue v
                JOIN descendants d ON v.parent_id = d.id
            )
            SELECT id FROM descendants
        """),
        {"vid": str(vid)},
    ).scalars().all()
    venue_ids = {vid} | set(child_ids)

    events = session.exec(
        select(Event).where(Event.venue_id.in_(venue_ids)).order_by(Event.date.desc())
    ).all()

    return _events_to_list_items(session, events)


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
