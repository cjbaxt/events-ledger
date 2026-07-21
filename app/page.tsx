"use client";
import { useState, useCallback, useEffect, Suspense } from "react";
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

  const handleEventClick = useCallback((id: string, p?: EventListItem) => { setSelectedId(id); setPreview(p ?? null); setPanelOpen(true); }, []);
  const handleClose = useCallback(() => setPanelOpen(false), []);
  const handleNavigate = useCallback((id: string) => { setSelectedId(id); setPreview(null); setPanelOpen(true); }, []);
  const handleEvent = useCallback((id: string) => { setSelectedId(id); setPreview(null); setPanelOpen(true); }, []);

  return (
    <div className="min-h-screen bg-white">
      <Suspense><EventParamHandler onEvent={handleEvent} /></Suspense>
      <Nav />
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-24 md:pt-20 md:pb-8">
        <Timeline onEventClick={handleEventClick} />
      </main>
      <EventDetailPanel open={panelOpen} eventId={selectedId} preview={preview} onClose={handleClose} onNavigate={handleNavigate} />
    </div>
  );
}
