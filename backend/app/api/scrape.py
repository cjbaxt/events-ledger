"""Scrape event data from supported websites."""
from fastapi import APIRouter, HTTPException, Query
from typing import Any
import urllib.request
import urllib.error
import re
import json
from datetime import datetime, timezone, timedelta

router = APIRouter()

BST = timezone(timedelta(hours=1))

# Fringe genre → our event type
FRINGE_GENRE_MAP: dict[str, str] = {
    "COMEDY": "comedy",
    "CABARET": "cabaret",
    "CIRCUS": "circus",
    "THEATRE": "theatre",
    "DANCE": "dance",
    "MUSIC": "music",
    "CLASSICAL MUSIC": "classical",
    "OPERA": "opera",
    "BALLET": "ballet",
    "SPOKEN WORD": "spoken_word",
    "EXHIBITIONS": "exhibition",
    "FILM": "screening",
    "CHILDREN'S SHOWS": "theatre",
    "EVENTS": "talk",
}

# Fringe subGenre keyword → our subtype (checked in order, first match wins)
FRINGE_SUBTYPE_MAP: list[tuple[str, str, str]] = [
    # (event_type, subgenre_keyword, our_subtype)
    ("comedy", "standup", "standup"),
    ("comedy", "stand-up", "standup"),
    ("comedy", "sketch", "sketch"),
    ("comedy", "musical", "musical_comedy"),
    ("comedy", "character", "character"),
    ("comedy", "double act", "double_act"),
    ("comedy", "magic", "comedy_magic"),
    ("cabaret", "cabaret", "cabaret"),
    ("cabaret", "burlesque", "burlesque"),
    ("cabaret", "drag", "drag"),
    ("cabaret", "variety", "variety"),
    ("circus", "physical", "physical_theatre"),
    ("circus", "aerial", "aerial"),
    ("circus", "contemporary", "contemporary"),
    ("theatre", "musical", "musical"),
    ("theatre", "physical", "physical_theatre"),
    ("theatre", "puppet", "puppet"),
    ("theatre", "improv", "improv"),
    ("dance", "contemporary", "contemporary"),
    ("dance", "flamenco", "flamenco"),
    ("music", "festival", "festival"),
    ("music", "choir", "choir"),
]


def _detect_subtype(event_type: str, sub_genre_raw: str) -> str:
    sg = sub_genre_raw.lower()
    for (t, keyword, subtype) in FRINGE_SUBTYPE_MAP:
        if t == event_type and keyword in sg:
            return subtype
    return "other"


def _parse_edfringe(url: str) -> dict[str, Any]:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"edfringe.com returned {e.code}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch page: {e}")

    m = re.search(r'<script[^>]+id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not m:
        raise HTTPException(status_code=422, detail="Could not find page data — edfringe.com may have changed its format")

    try:
        page_data = json.loads(m.group(1))
        event = page_data["props"]["pageProps"]["data"]["event"]
    except (json.JSONDecodeError, KeyError) as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse page data: {e}")

    title = event.get("title", "")
    description = event.get("description", "") or ""
    # Strip markdown-style star ratings from description
    description = re.sub(r"\*+\s*\([^)]+\)", "", description).strip()

    genre_raw = event.get("genre", "") or ""
    sub_genre_raw = event.get("subGenre", "") or ""
    event_type = FRINGE_GENRE_MAP.get(genre_raw.upper(), "other")

    # If genre says COMEDY but subGenre says Cabaret, promote to cabaret type
    if event_type == "comedy" and "cabaret" in sub_genre_raw.lower():
        event_type = "cabaret"

    subtype = _detect_subtype(event_type, sub_genre_raw)

    # Venue: prefer the specific space name, fall back to outer venue
    venue_name = ""
    spaces = event.get("spaces") or []
    venues = event.get("venues") or []
    if spaces:
        venue_name = spaces[0].get("venueName") or spaces[0].get("title") or ""
    if not venue_name and venues:
        venue_name = venues[0].get("title") or ""

    # Performances: convert UTC datetimes to BST, filter cancelled
    performances = []
    for perf in event.get("performances") or []:
        if perf.get("cancelled"):
            continue
        dt_str = perf.get("dateTime") or ""
        if not dt_str:
            continue
        try:
            dt_utc = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
            dt_bst = dt_utc.astimezone(BST)
            date = dt_bst.strftime("%Y-%m-%d")
            time = dt_bst.strftime("%H:%M")
            label_parts = [dt_bst.strftime("%a %-d %b"), time]
            note = perf.get("title") or ""
            if note:
                label_parts.append(f"({note})")
            performances.append({"date": date, "time": time, "label": " ".join(label_parts)})
        except ValueError:
            continue

    return {
        "source": "edfringe",
        "title": title,
        "type_suggestion": event_type,
        "subtype_suggestion": subtype,
        "venue_name": venue_name,
        "performances": performances,
        "description": description,
        "description_source_url": url,
        "festival_hint": "Edinburgh Festival Fringe 2026",
    }


SUPPORTED_SOURCES = {
    "edfringe.com": _parse_edfringe,
}


@router.get("/api/scrape/event")
def scrape_event(url: str = Query(...)) -> dict[str, Any]:
    url = url.strip()
    for domain, parser in SUPPORTED_SOURCES.items():
        if domain in url:
            return parser(url)
    supported = ", ".join(SUPPORTED_SOURCES.keys())
    raise HTTPException(status_code=400, detail=f"Unsupported source. Supported: {supported}")
