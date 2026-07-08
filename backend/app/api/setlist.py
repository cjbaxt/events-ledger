"""Fetch and parse setlist from setlist.fm."""
from fastapi import APIRouter, HTTPException, Query
from typing import List
import urllib.request
import urllib.error
import re
import html

router = APIRouter()


@router.get("/api/setlist/fetch", response_model=List[str])
def fetch_setlist(url: str = Query(..., description="setlist.fm URL")):
    if "setlist.fm" not in url:
        raise HTTPException(status_code=400, detail="Only setlist.fm URLs are supported")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"setlist.fm returned {e.code}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch URL: {e}")

    # Extract song names from setlist.fm HTML
    # Songs appear as: <a class="songLabel">Song Name</a>
    # Encore dividers appear as <li class="sectionBreak"> which we can use to note encores
    songs = re.findall(r'class="songLabel"[^>]*>([^<]+)<', html)
    if not songs:
        # Fallback: try data-song attribute
        songs = re.findall(r'data-song="([^"]+)"', html)
    if not songs:
        raise HTTPException(status_code=422, detail="Could not parse any songs from the page — the format may have changed")

    return [html.unescape(s).strip() for s in songs if s.strip()]
