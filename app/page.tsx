"use client";
import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Timeline from "@/components/Timeline";
import EventDetailPanel from "@/components/EventDetailPanel";
import type { EventListItem } from "@/lib/types";

function EventParamHandler({ onEvent }: { onEvent: (id: string) => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    const eventId = searchParams.get("event");
    if (eventId) { onEvent(eventId); router.replace("/"); }
  }, [searchParams, router, onEvent]);
  return null;
}

export default function Home() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<EventListItem | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const savedScrollY = useRef(0);
  const yearEventIdsRef = useRef<string[]>([]);

  const handleYearEventsChange = useCallback((ids: string[]) => {
    yearEventIdsRef.current = ids;
  }, []);

  const getAdjacentId = useCallback((currentId: string, dir: 1 | -1): string | null => {
    const ids = yearEventIdsRef.current;
    const idx = ids.indexOf(currentId);
    if (idx === -1) return null;
    const next = idx + dir;
    return next >= 0 && next < ids.length ? ids[next] : null;
  }, []);

  const handleEventClick = useCallback((id: string, p?: EventListItem) => {
    savedScrollY.current = window.scrollY;
    setSelectedId(id);
    setPreview(p ?? null);
    setPanelOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setPanelOpen(false);
    // Restore scroll position after the panel slide-out animation
    const y = savedScrollY.current;
    requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" }));
  }, []);

  const handleNavigate = useCallback((id: string) => {
    setSelectedId(id);
    setPreview(null);
    setPanelOpen(true);
  }, []);

  const handleEvent = useCallback((id: string) => {
    setSelectedId(id);
    setPreview(null);
    setPanelOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Suspense><EventParamHandler onEvent={handleEvent} /></Suspense>
      <Nav />
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-24 md:pt-20 md:pb-8">
        <Timeline
          onEventClick={handleEventClick}
          openEventId={panelOpen ? selectedId : null}
          onYearEventsChange={handleYearEventsChange}
        />
      </main>
      <EventDetailPanel
        open={panelOpen}
        eventId={selectedId}
        preview={preview}
        onClose={handleClose}
        onNavigate={handleNavigate}
        getAdjacentId={getAdjacentId}
      />
    </div>
  );
}
