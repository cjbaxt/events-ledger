"use client";
import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Timeline from "@/components/Timeline";
import EventDetailPanel from "@/components/EventDetailPanel";

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
  const [panelOpen, setPanelOpen] = useState(false);

  const handleEventClick = useCallback((id: string) => { setSelectedId(id); setPanelOpen(true); }, []);
  const handleClose = useCallback(() => setPanelOpen(false), []);
  const handleNavigate = useCallback((id: string) => { setSelectedId(id); setPanelOpen(true); }, []);
  const handleEvent = useCallback((id: string) => { setSelectedId(id); setPanelOpen(true); }, []);

  return (
    <div className="min-h-screen bg-neutral-50">
      <Suspense><EventParamHandler onEvent={handleEvent} /></Suspense>
      <Nav />
      <main className="pt-14 pb-20 md:pb-8 max-w-2xl mx-auto px-4 py-6 md:py-10">
        <Timeline onEventClick={handleEventClick} />
      </main>
      <EventDetailPanel open={panelOpen} eventId={selectedId} onClose={handleClose} onNavigate={handleNavigate} />
    </div>
  );
}
