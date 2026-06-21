"""Event endpoints — list, detail, create (per type), update, delete."""
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from sqlalchemy import text
import uuid

from app.db import get_session
from app.models import (
    Event, Venue, Festival, Person, Ensemble, Work, PaymentMethod,
    EventMusic, EventClassical, ClassicalProgrammeItem,
    EventOpera, EventBallet, BalletProgrammeItem, BalletProgrammeMusic,
    EventDance, EventCircus, EventTheatre, EventCabaret,
    EventComedy, EventSpokenWord, EventTalk, EventExhibition, EventScreening,
)
from app.schemas.events import (
    EventListItem, EventDetail, EventUpdate, PaymentMethodRef,
    EventMusicCreate, EventClassicalCreate, EventOperaCreate,
    EventBalletCreate, EventDanceCreate, EventCircusCreate,
    EventTheatreCreate, EventCabaretCreate, EventComedyCreate,
    EventSpokenWordCreate, EventTalkCreate, EventExhibitionCreate,
    EventScreeningCreate, EventOtherCreate,
)
from app.schemas.reference import NamedRef

router = APIRouter(prefix="/events")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _resolve_name(session: Session, model, id) -> Optional[NamedRef]:
    if id is None:
        return None
    obj = session.get(model, id)
    if not obj:
        return None
    name = getattr(obj, "name", None) or getattr(obj, "title", None) or str(id)
    return NamedRef(id=obj.id, name=name)


def _person_name(session: Session, id) -> Optional[str]:
    if id is None:
        return None
    p = session.get(Person, id)
    return p.name if p else None


def _ensemble_name(session: Session, id) -> Optional[str]:
    if id is None:
        return None
    e = session.get(Ensemble, id)
    return e.name if e else None


def _primary_entity(session: Session, event) -> tuple[Optional[str], Optional[uuid.UUID], Optional[str]]:
    """Return (name, id, kind) where kind is 'person' or 'ensemble'."""
    t = event.type
    if t == "comedy":
        ext = session.get(EventComedy, event.id)
        if ext:
            if ext.performer_id:
                p = session.get(Person, ext.performer_id)
                return (p.name, p.id, "person") if p else (None, None, None)
            if ext.ensemble_id:
                e = session.get(Ensemble, ext.ensemble_id)
                return (e.name, e.id, "ensemble") if e else (None, None, None)
    elif t == "music":
        ext = session.get(EventMusic, event.id)
        if ext:
            if ext.headliner_ensemble_id:
                e = session.get(Ensemble, ext.headliner_ensemble_id)
                return (e.name, e.id, "ensemble") if e else (None, None, None)
            if ext.headliner_person_id:
                p = session.get(Person, ext.headliner_person_id)
                return (p.name, p.id, "person") if p else (None, None, None)
    elif t == "circus":
        ext = session.get(EventCircus, event.id)
        if ext and ext.company_id:
            e = session.get(Ensemble, ext.company_id)
            return (e.name, e.id, "ensemble") if e else (None, None, None)
    elif t == "theatre":
        ext = session.get(EventTheatre, event.id)
        if ext:
            if ext.company_id:
                e = session.get(Ensemble, ext.company_id)
                return (e.name, e.id, "ensemble") if e else (None, None, None)
            if ext.director_id:
                p = session.get(Person, ext.director_id)
                return (p.name, p.id, "person") if p else (None, None, None)
    elif t == "cabaret":
        ext = session.get(EventCabaret, event.id)
        if ext:
            if ext.ensemble_id:
                e = session.get(Ensemble, ext.ensemble_id)
                return (e.name, e.id, "ensemble") if e else (None, None, None)
            if ext.headliner_id:
                p = session.get(Person, ext.headliner_id)
                return (p.name, p.id, "person") if p else (None, None, None)
    elif t == "ballet":
        ext = session.get(EventBallet, event.id)
        if ext and ext.company_id:
            e = session.get(Ensemble, ext.company_id)
            return (e.name, e.id, "ensemble") if e else (None, None, None)
    elif t == "classical":
        ext = session.get(EventClassical, event.id)
        if ext and ext.ensemble_id:
            e = session.get(Ensemble, ext.ensemble_id)
            return (e.name, e.id, "ensemble") if e else (None, None, None)
    elif t == "opera":
        ext = session.get(EventOpera, event.id)
        if ext and ext.ensemble_id:
            e = session.get(Ensemble, ext.ensemble_id)
            return (e.name, e.id, "ensemble") if e else (None, None, None)
    elif t == "dance":
        ext = session.get(EventDance, event.id)
        if ext and ext.company_id:
            e = session.get(Ensemble, ext.company_id)
            return (e.name, e.id, "ensemble") if e else (None, None, None)
    elif t == "talk":
        ext = session.get(EventTalk, event.id)
        if ext and ext.speaker_ids:
            p = session.get(Person, ext.speaker_ids[0])
            return (p.name, p.id, "person") if p else (None, None, None)
    return (None, None, None)


def _resolve_ids_to_names(session: Session, ids: Optional[List[uuid.UUID]], model) -> Optional[List[dict]]:
    if not ids:
        return None
    results = []
    for id in ids:
        obj = session.get(model, id)
        if obj:
            results.append({"id": str(obj.id), "name": obj.name})
    return results or None


def _venue_display(session: Session, venue_id: Optional[uuid.UUID]):
    """Return (venue, ancestor_path, display_name).
    ancestor_path is list of Venue objects from immediate parent to root.
    display_name is 'Child, ImmediateParent' (two levels, for list views).
    """
    if not venue_id:
        return None, [], "Unknown"
    venue = session.get(Venue, venue_id)
    if not venue:
        return None, [], "Unknown"
    path = []
    current = venue
    seen = {current.id}
    while current.parent_id and current.parent_id not in seen:
        parent = session.get(Venue, current.parent_id)
        if not parent:
            break
        path.append(parent)
        seen.add(parent.id)
        current = parent
    display = f"{venue.name}, {path[0].name}" if path else venue.name
    return venue, path, display


def _resolve_work(session: Session, work_id: Optional[uuid.UUID]) -> Optional[dict]:
    """Resolve a work_id to { id, title, creator } for display."""
    if work_id is None:
        return None
    work = session.get(Work, work_id)
    if not work:
        return None
    creator = None
    if work.creator_id:
        p = session.get(Person, work.creator_id)
        if p:
            creator = p.name
    creator_id = str(work.creator_id) if work.creator_id else None
    return {"id": str(work.id), "title": work.title, "creator": creator, "creator_id": creator_id, "year": work.year, "notes": work.notes}


def _resolve_credits(session: Session, event_id: uuid.UUID) -> Optional[list]:
    """Return credits as [{role, person: {id, name}}] ordered by sort_order."""
    from app.models import EventCredit
    rows = session.exec(
        select(EventCredit)
        .where(EventCredit.event_id == event_id)
        .order_by(EventCredit.sort_order)
    ).all()
    if not rows:
        return None
    result = []
    for row in rows:
        p = session.get(Person, row.person_id)
        if p:
            result.append({"role": row.role, "person": {"id": str(p.id), "name": p.name}})
    return result or None


def _resolve_cast(session: Session, cast: Optional[dict]) -> Optional[dict]:
    """Resolve cast dict {role: UUID} → {role: person_name}."""
    if not cast:
        return None
    resolved = {}
    for role, val in cast.items():
        if isinstance(val, list):
            names = []
            for v in val:
                try:
                    p = session.get(Person, uuid.UUID(str(v)))
                    names.append({"id": str(p.id), "name": p.name} if p else str(v))
                except Exception:
                    names.append(str(v))
            resolved[role] = names
        else:
            try:
                p = session.get(Person, uuid.UUID(str(val)))
                resolved[role] = {"id": str(p.id), "name": p.name} if p else str(val)
            except Exception:
                resolved[role] = str(val)
    return resolved or None


def _build_extension(session: Session, event: Event) -> Optional[dict]:
    """Fetch and enrich the type-specific extension for an event."""
    t = event.type

    if t == "music":
        ext = session.get(EventMusic, event.id)
        if not ext:
            return None
        return {
            "subtype": ext.subtype,
            "headliner": _resolve_name(session, Person, ext.headliner_person_id),
            "headliner_ensemble": _resolve_name(session, Ensemble, ext.headliner_ensemble_id),
            "support_acts": (
                (_resolve_ids_to_names(session, ext.support_act_person_ids, Person) or []) +
                (_resolve_ids_to_names(session, ext.support_act_ensemble_ids, Ensemble) or [])
            ) or None,
            "tour_name": ext.tour_name,
            "setlist": ext.setlist,
            "setlist_fm_url": ext.setlist_fm_url,
        }

    if t == "classical":
        ext = session.get(EventClassical, event.id)
        if not ext:
            return None
        items = session.exec(
            select(ClassicalProgrammeItem)
            .where(ClassicalProgrammeItem.event_id == event.id)
            .order_by(ClassicalProgrammeItem.order)
        ).all()
        programme = []
        for item in items:
            from app.models import MusicalPiece
            piece = session.get(MusicalPiece, item.musical_piece_id)
            composer = _resolve_name(session, Person, piece.composer_id) if piece and piece.composer_id else None
            programme.append({
                "order": item.order,
                "piece": {"id": str(piece.id), "title": piece.title, "movement": piece.movement} if piece else None,
                "composer": composer,
                "soloists": _resolve_ids_to_names(session, item.soloists, Person),
                "notes": item.notes,
            })
        return {
            "subtype": ext.subtype,
            "ensemble": _resolve_name(session, Ensemble, ext.ensemble_id),
            "conductor": _resolve_name(session, Person, ext.conductor_id),
            "credits": _resolve_credits(session, event.id),
            "notes_on_performance": ext.notes_on_performance,
            "programme": programme,
        }

    if t == "opera":
        ext = session.get(EventOpera, event.id)
        if not ext:
            return None
        return {
            "subtype": ext.subtype,
            "work": _resolve_work(session, ext.work_id),
            "composers": _resolve_ids_to_names(session, ext.composers, Person),
            "ensemble": _resolve_name(session, Ensemble, ext.ensemble_id),
            "libretto_language": ext.libretto_language,
            "surtitles_languages": ext.surtitles_languages,
            "cast": _resolve_cast(session, ext.cast),
            "credits": _resolve_credits(session, event.id),
            "operabase_url": ext.operabase_url,
        }

    if t == "ballet":
        ext = session.get(EventBallet, event.id)
        if not ext:
            return None
        items = session.exec(
            select(BalletProgrammeItem)
            .where(BalletProgrammeItem.event_id == event.id)
            .order_by(BalletProgrammeItem.order)
        ).all()
        programme = []
        for item in items:
            music = session.exec(
                select(BalletProgrammeMusic)
                .where(BalletProgrammeMusic.programme_item_id == item.id)
                .order_by(BalletProgrammeMusic.order)
            ).all()
            from app.models import MusicalPiece
            programme.append({
                "order": item.order,
                "work": _resolve_name(session, Work, item.work_id),
                "choreographer": _resolve_name(session, Person, item.choreographer_id),
                "soloists": _resolve_ids_to_names(session, item.soloists, Person),
                "music": [
                    {
                        "id": str(m.musical_piece_id),
                        "title": (session.get(MusicalPiece, m.musical_piece_id).title if session.get(MusicalPiece, m.musical_piece_id) else None),
                        "composer": _resolve_name(session, Person, session.get(MusicalPiece, m.musical_piece_id).composer_id) if session.get(MusicalPiece, m.musical_piece_id) and session.get(MusicalPiece, m.musical_piece_id).composer_id else None,
                        "composer_text": session.get(MusicalPiece, m.musical_piece_id).composer_text if session.get(MusicalPiece, m.musical_piece_id) else None,
                    }
                    for m in music
                ],
            })
        additional_companies = [
            _resolve_name(session, Ensemble, cid)
            for cid in (ext.additional_company_ids or [])
            if cid
        ]
        return {
            "subtype": ext.subtype,
            "company": _resolve_name(session, Ensemble, ext.company_id),
            "additional_companies": additional_companies if additional_companies else None,
            "orchestra": _resolve_name(session, Ensemble, ext.orchestra_id),
            "cast": _resolve_cast(session, ext.cast),
            "credits": _resolve_credits(session, event.id),
            "programme": programme,
        }

    if t == "dance":
        ext = session.get(EventDance, event.id)
        if not ext:
            return None
        return {
            "subtype": ext.subtype,
            "company": _resolve_name(session, Ensemble, ext.company_id),
            "choreographer": _resolve_name(session, Person, ext.choreographer_id),
            "work": _resolve_work(session, ext.work_id),
            "music_notes": ext.music_notes,
        }

    if t == "circus":
        ext = session.get(EventCircus, event.id)
        if not ext:
            return None
        return {
            "subtype": ext.subtype,
            "company": _resolve_name(session, Ensemble, ext.company_id),
            "director": _resolve_name(session, Person, ext.director_id),
            "work": _resolve_work(session, ext.work_id),
        }

    if t == "theatre":
        ext = session.get(EventTheatre, event.id)
        if not ext:
            return None
        return {
            "subtype": ext.subtype,
            "work": _resolve_work(session, ext.work_id),
            "company": _resolve_name(session, Ensemble, ext.company_id),
            "director": _resolve_name(session, Person, ext.director_id),
            "playwright": _resolve_name(session, Person, ext.playwright_id),
            "cast": _resolve_cast(session, ext.cast),
            "credits": _resolve_credits(session, event.id),
        }

    if t == "cabaret":
        ext = session.get(EventCabaret, event.id)
        if not ext:
            return None
        return {
            "subtype": ext.subtype,
            "headliner": _resolve_name(session, Person, ext.headliner_id),
            "host": _resolve_name(session, Person, ext.host_id),
            "supporting_cast": _resolve_ids_to_names(session, ext.supporting_cast, Person),
            "ensemble": _resolve_name(session, Ensemble, ext.ensemble_id),
            "tour_name": ext.tour_name,
            "work": _resolve_work(session, ext.work_id),
        }

    if t == "comedy":
        ext = session.get(EventComedy, event.id)
        if not ext:
            return None
        return {
            "subtype": ext.subtype,
            "performer": _resolve_name(session, Person, ext.performer_id),
            "support_acts": _resolve_ids_to_names(session, ext.support_acts, Person),
            "ensemble": _resolve_name(session, Ensemble, ext.ensemble_id),
            "tour_name": ext.tour_name,
        }

    if t == "spoken_word":
        ext = session.get(EventSpokenWord, event.id)
        if not ext:
            return None
        return {
            "subtype": ext.subtype,
            "performers": _resolve_ids_to_names(session, ext.performers, Person),
            "works_read": _resolve_ids_to_names(session, ext.works_read, Work),
            "host": _resolve_name(session, Person, ext.host_id),
        }

    if t == "talk":
        ext = session.get(EventTalk, event.id)
        if not ext:
            return None
        return {
            "subtype": ext.subtype,
            "speakers": _resolve_ids_to_names(session, ext.speaker_ids, Person),
            "host": _resolve_name(session, Person, ext.host_id),
            "topic": ext.topic,
            "host_organisation": ext.host_organisation,
            "recording_url": ext.recording_url,
        }

    if t == "exhibition":
        ext = session.get(EventExhibition, event.id)
        if not ext:
            return None
        return {
            "subtype": ext.subtype,
            "exhibition_title": ext.exhibition_title,
            "artists": _resolve_ids_to_names(session, ext.artists, Person),
            "period": ext.period,
            "medium": ext.medium,
            "curator": _resolve_name(session, Person, ext.curator_id),
            "permanent_or_temp": ext.permanent_or_temp,
            "exhibition_url": ext.exhibition_url,
        }

    if t == "screening":
        ext = session.get(EventScreening, event.id)
        if not ext:
            return None
        return {
            "subtype": ext.subtype,
            "work": _resolve_work(session, ext.work_id),
            "director": _resolve_name(session, Person, ext.director_id),
            "conductor": _resolve_name(session, Person, ext.conductor_id),
            "ensemble": _resolve_name(session, Ensemble, ext.ensemble_id),
            "series": ext.series,
        }

    return None  # "other" has no extension table


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------

@router.get("", response_model=List[EventListItem])
def list_events(
    type: Optional[str] = None,
    festival_id: Optional[uuid.UUID] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    data_completeness: Optional[str] = None,
    status: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    session: Session = Depends(get_session),
):
    stmt = select(Event).order_by(Event.date.desc())
    if type:
        stmt = stmt.where(Event.type == type)
    if festival_id:
        stmt = stmt.where(Event.festival_id == festival_id)
    if date_from:
        stmt = stmt.where(Event.date >= date_from)
    if date_to:
        stmt = stmt.where(Event.date <= date_to)
    if data_completeness:
        stmt = stmt.where(Event.data_completeness == data_completeness)
    if status:
        stmt = stmt.where(Event.status == status)
    if q:
        stmt = stmt.where(Event.title.ilike(f"%{q}%"))
    stmt = stmt.offset(offset).limit(limit)

    events = session.exec(stmt).all()

    result = []
    for e in events:
        venue, _parent, venue_display = _venue_display(session, e.venue_id)
        festival = session.get(Festival, e.festival_id) if e.festival_id else None
        entity_name, entity_id, entity_kind = _primary_entity(session, e)
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
            payment_method_id=e.payment_method_id,
            rating=e.rating,
            data_completeness=e.data_completeness,
            status=e.status,
            primary_entity_name=entity_name,
            primary_entity_id=entity_id,
            primary_entity_kind=entity_kind,
        ))
    return result


# ---------------------------------------------------------------------------
# Detail
# ---------------------------------------------------------------------------

@router.get("/{event_id}", response_model=EventDetail)
def get_event(event_id: uuid.UUID, session: Session = Depends(get_session)):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    venue, venue_path, venue_display = _venue_display(session, event.venue_id)
    festival = session.get(Festival, event.festival_id) if event.festival_id else None
    pm = session.get(PaymentMethod, event.payment_method_id) if event.payment_method_id else None

    related_events = []
    if event.related_event_ids:
        for rid in event.related_event_ids:
            rel = session.get(Event, rid)
            if rel:
                related_events.append({"id": str(rel.id), "title": rel.title, "date": str(rel.date), "type": rel.type})

    return EventDetail(
        id=event.id,
        date=event.date,
        time=event.time,
        type=event.type,
        subtype=event.subtype,
        title=event.title,
        venue=NamedRef(id=venue.id, name=venue.name) if venue else NamedRef(id=event.venue_id, name="Unknown"),
        venue_path=[NamedRef(id=v.id, name=v.name) for v in venue_path],
        work_id=event.work_id,
        festival=NamedRef(id=festival.id, name=f"{festival.name} {festival.edition}".strip()) if festival else None,
        price_paid=event.price_paid,
        currency=event.currency,
        payment_method=PaymentMethodRef(
            id=pm.id, name=pm.name, total_cost=pm.total_cost,
            currency=pm.currency, purchase_date=pm.purchase_date,
        ) if pm else None,
        rating=event.rating,
        notes=event.notes,
        review=event.review,
        links=event.links,
        data_completeness=event.data_completeness,
        related_events=related_events,
        extension=_build_extension(session, event),
    )


# ---------------------------------------------------------------------------
# Update base event fields
# ---------------------------------------------------------------------------

_EXTENSION_MODELS = {
    "music": EventMusic, "classical": EventClassical, "opera": EventOpera,
    "ballet": EventBallet, "dance": EventDance, "circus": EventCircus,
    "theatre": EventTheatre, "cabaret": EventCabaret, "comedy": EventComedy,
    "spoken_word": EventSpokenWord, "talk": EventTalk,
    "exhibition": EventExhibition, "screening": EventScreening,
}


@router.patch("/{event_id}", response_model=EventDetail)
def update_event(event_id: uuid.UUID, data: EventUpdate, session: Session = Depends(get_session)):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    dumped = data.model_dump(exclude_unset=True)
    extension_data = dumped.pop("extension", None)
    for field, value in dumped.items():
        setattr(event, field, value)
    session.add(event)
    if extension_data:
        ext_model = _EXTENSION_MODELS.get(event.type)
        if ext_model:
            ext = session.get(ext_model, event_id)
            if ext:
                for field, value in extension_data.items():
                    if hasattr(ext, field):
                        setattr(ext, field, value)
                session.add(ext)
    session.commit()
    session.refresh(event)
    return get_event(event_id, session)


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

@router.delete("/{event_id}", status_code=204)
def delete_event(event_id: uuid.UUID, session: Session = Depends(get_session)):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    # Extension tables have no CASCADE defined in the migration, so delete extension first
    for model in [
        EventMusic, EventClassical, EventOpera, EventBallet,
        EventDance, EventCircus, EventTheatre, EventCabaret,
        EventComedy, EventSpokenWord, EventTalk, EventExhibition, EventScreening,
    ]:
        ext = session.get(model, event_id)
        if ext:
            session.delete(ext)
    # Programme items
    for item in session.exec(select(ClassicalProgrammeItem).where(ClassicalProgrammeItem.event_id == event_id)).all():
        session.delete(item)
    for item in session.exec(select(BalletProgrammeItem).where(BalletProgrammeItem.event_id == event_id)).all():
        for music in session.exec(select(BalletProgrammeMusic).where(BalletProgrammeMusic.programme_item_id == item.id)).all():
            session.delete(music)
        session.delete(item)
    session.delete(event)
    session.commit()


# ---------------------------------------------------------------------------
# Create — one endpoint per event type
# ---------------------------------------------------------------------------

def _make_event(data, type: str) -> Event:
    base_fields = {
        "date", "time", "venue_id", "title", "work_id", "price_paid",
        "currency", "rating", "notes", "festival_id", "review", "links", "data_completeness",
    }
    return Event(type=type, **{k: v for k, v in data.model_dump().items() if k in base_fields})


@router.post("/music", response_model=EventDetail, status_code=201)
def create_music_event(data: EventMusicCreate, session: Session = Depends(get_session)):
    event = _make_event(data, "music")
    session.add(event)
    session.flush()
    session.add(EventMusic(
        event_id=event.id,
        subtype=data.subtype,
        headliner_person_id=data.headliner_person_id,
        headliner_ensemble_id=data.headliner_ensemble_id,
        support_act_person_ids=data.support_act_person_ids,
        support_act_ensemble_ids=data.support_act_ensemble_ids,
        tour_name=data.tour_name,
        setlist=data.setlist,
        setlist_fm_url=data.setlist_fm_url,
    ))
    session.commit()
    session.refresh(event)
    return get_event(event.id, session)


@router.post("/classical", response_model=EventDetail, status_code=201)
def create_classical_event(data: EventClassicalCreate, session: Session = Depends(get_session)):
    event = _make_event(data, "classical")
    session.add(event)
    session.flush()
    session.add(EventClassical(
        event_id=event.id,
        subtype=data.subtype,
        ensemble_id=data.ensemble_id,
        conductor_id=data.conductor_id,
        notes_on_performance=data.notes_on_performance,
    ))
    session.flush()
    if data.programme:
        for i, item in enumerate(data.programme):
            session.add(ClassicalProgrammeItem(
                event_id=event.id,
                musical_piece_id=item.musical_piece_id,
                soloists=item.soloists,
                order=item.order if item.order is not None else i + 1,
                notes=item.notes,
            ))
    session.commit()
    session.refresh(event)
    return get_event(event.id, session)


@router.post("/opera", response_model=EventDetail, status_code=201)
def create_opera_event(data: EventOperaCreate, session: Session = Depends(get_session)):
    event = _make_event(data, "opera")
    session.add(event)
    session.flush()
    session.add(EventOpera(
        event_id=event.id,
        subtype=data.subtype,
        work_id=data.work_id,
        production_id=data.production_id,
        conductor_id=data.conductor_id,
        director_id=data.director_id,
        cast=data.cast,
        ensemble_id=data.ensemble_id,
        libretto_language=data.libretto_language,
        surtitles_languages=data.surtitles_languages,
        operabase_url=data.operabase_url,
    ))
    session.commit()
    session.refresh(event)
    return get_event(event.id, session)


@router.post("/ballet", response_model=EventDetail, status_code=201)
def create_ballet_event(data: EventBalletCreate, session: Session = Depends(get_session)):
    event = _make_event(data, "ballet")
    session.add(event)
    session.flush()
    session.add(EventBallet(
        event_id=event.id,
        subtype=data.subtype,
        work_id=data.work_id,
        production_id=data.production_id,
        company_id=data.company_id,
        orchestra_id=data.orchestra_id,
        conductor_id=data.conductor_id,
        cast=data.cast,
    ))
    session.flush()
    if data.programme:
        for i, item in enumerate(data.programme):
            bpi = BalletProgrammeItem(
                event_id=event.id,
                work_id=item.work_id,
                choreographer_id=item.choreographer_id,
                soloists=item.soloists,
                order=item.order if item.order is not None else i + 1,
            )
            session.add(bpi)
            session.flush()
            if item.musical_pieces:
                for j, mp_id in enumerate(item.musical_pieces):
                    session.add(BalletProgrammeMusic(
                        programme_item_id=bpi.id,
                        musical_piece_id=mp_id,
                        order=j + 1,
                    ))
    session.commit()
    session.refresh(event)
    return get_event(event.id, session)


@router.post("/dance", response_model=EventDetail, status_code=201)
def create_dance_event(data: EventDanceCreate, session: Session = Depends(get_session)):
    event = _make_event(data, "dance")
    session.add(event)
    session.flush()
    session.add(EventDance(
        event_id=event.id,
        subtype=data.subtype,
        company_id=data.company_id,
        choreographer_id=data.choreographer_id,
        work_id=data.work_id,
        programme=data.programme,
        music_notes=data.music_notes,
    ))
    session.commit()
    session.refresh(event)
    return get_event(event.id, session)


@router.post("/circus", response_model=EventDetail, status_code=201)
def create_circus_event(data: EventCircusCreate, session: Session = Depends(get_session)):
    event = _make_event(data, "circus")
    session.add(event)
    session.flush()
    session.add(EventCircus(
        event_id=event.id,
        subtype=data.subtype,
        company_id=data.company_id,
        director_id=data.director_id,
        work_id=data.work_id,
    ))
    session.commit()
    session.refresh(event)
    return get_event(event.id, session)


@router.post("/theatre", response_model=EventDetail, status_code=201)
def create_theatre_event(data: EventTheatreCreate, session: Session = Depends(get_session)):
    event = _make_event(data, "theatre")
    session.add(event)
    session.flush()
    session.add(EventTheatre(
        event_id=event.id,
        subtype=data.subtype,
        work_id=data.work_id,
        production_id=data.production_id,
        company_id=data.company_id,
        director_id=data.director_id,
        cast=data.cast,
        playwright_id=data.playwright_id,
    ))
    session.commit()
    session.refresh(event)
    return get_event(event.id, session)


@router.post("/cabaret", response_model=EventDetail, status_code=201)
def create_cabaret_event(data: EventCabaretCreate, session: Session = Depends(get_session)):
    event = _make_event(data, "cabaret")
    session.add(event)
    session.flush()
    session.add(EventCabaret(
        event_id=event.id,
        subtype=data.subtype,
        headliner_id=data.headliner_id,
        host_id=data.host_id,
        supporting_cast=data.supporting_cast,
        ensemble_id=data.ensemble_id,
        tour_name=data.tour_name,
        work_id=data.work_id,
    ))
    session.commit()
    session.refresh(event)
    return get_event(event.id, session)


@router.post("/comedy", response_model=EventDetail, status_code=201)
def create_comedy_event(data: EventComedyCreate, session: Session = Depends(get_session)):
    event = _make_event(data, "comedy")
    session.add(event)
    session.flush()
    session.add(EventComedy(
        event_id=event.id,
        subtype=data.subtype,
        performer_id=data.performer_id,
        support_acts=data.support_acts,
        ensemble_id=data.ensemble_id,
        tour_name=data.tour_name,
    ))
    session.commit()
    session.refresh(event)
    return get_event(event.id, session)


@router.post("/spoken-word", response_model=EventDetail, status_code=201)
def create_spoken_word_event(data: EventSpokenWordCreate, session: Session = Depends(get_session)):
    event = _make_event(data, "spoken_word")
    session.add(event)
    session.flush()
    session.add(EventSpokenWord(
        event_id=event.id,
        subtype=data.subtype,
        performers=data.performers,
        works_read=data.works_read,
        host_id=data.host_id,
    ))
    session.commit()
    session.refresh(event)
    return get_event(event.id, session)


@router.post("/talk", response_model=EventDetail, status_code=201)
def create_talk_event(data: EventTalkCreate, session: Session = Depends(get_session)):
    event = _make_event(data, "talk")
    session.add(event)
    session.flush()
    session.add(EventTalk(
        event_id=event.id,
        subtype=data.subtype,
        speaker_ids=data.speaker_ids,
        host_id=data.host_id,
        topic=data.topic,
        host_organisation=data.host_organisation,
        recording_url=data.recording_url,
    ))
    session.commit()
    session.refresh(event)
    return get_event(event.id, session)


@router.post("/exhibition", response_model=EventDetail, status_code=201)
def create_exhibition_event(data: EventExhibitionCreate, session: Session = Depends(get_session)):
    event = _make_event(data, "exhibition")
    session.add(event)
    session.flush()
    session.add(EventExhibition(
        event_id=event.id,
        subtype=data.subtype,
        exhibition_title=data.exhibition_title,
        artists=data.artists,
        period=data.period,
        medium=data.medium,
        curator_id=data.curator_id,
        permanent_or_temp=data.permanent_or_temp,
        exhibition_url=data.exhibition_url,
    ))
    session.commit()
    session.refresh(event)
    return get_event(event.id, session)


@router.post("/screening", response_model=EventDetail, status_code=201)
def create_screening_event(data: EventScreeningCreate, session: Session = Depends(get_session)):
    event = _make_event(data, "screening")
    session.add(event)
    session.flush()
    session.add(EventScreening(
        event_id=event.id,
        subtype=data.subtype,
        work_id=data.work_id,
        director_id=data.director_id,
        conductor_id=data.conductor_id,
        ensemble_id=data.ensemble_id,
        series=data.series,
    ))
    session.commit()
    session.refresh(event)
    return get_event(event.id, session)


@router.post("/other", response_model=EventDetail, status_code=201)
def create_other_event(data: EventOtherCreate, session: Session = Depends(get_session)):
    event = _make_event(data, "other")
    event.subtype = data.subtype
    session.add(event)
    session.commit()
    session.refresh(event)
    return get_event(event.id, session)
