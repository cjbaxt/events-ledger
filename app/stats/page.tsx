"use client";
import { useState, useCallback } from "react";
import Nav from "@/components/Nav";
import Stats from "@/components/Stats";
import EventDetailPanel from "@/components/EventDetailPanel";

export default function StatsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const handleEventClick = useCallback((id: string) => { setSelectedId(id); setPanelOpen(true); }, []);
  const handleClose = useCallback(() => { setPanelOpen(false); }, []);
  const handleNavigate = useCallback((id: string) => { setSelectedId(id); setPanelOpen(true); }, []);

  // Entity/venue clicks: open panel in nav mode by routing to a fake event then navigating
  // The EventDetailPanel's internal NavEventsView handles person/venue browsing once you're inside.
  // Stats callbacks are currently no-ops for entities/venues since the panel requires an event entry point.
  // TODO: extend EventDetailPanel to accept an initial nav target
  const handleEntityClick = useCallback((_id: string, _kind: "person" | "ensemble" | null) => {
    // no-op until panel supports direct entity entry
  }, []);
  const handleVenueClick = useCallback((_id: string) => {
    // no-op until panel supports direct venue entry
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50">
      <Nav />
      <main className="pt-14 pb-20 md:pb-8 max-w-2xl mx-auto px-4 py-6 md:py-10">
        <Stats onEventClick={handleEventClick} onEntityClick={handleEntityClick} onVenueClick={handleVenueClick} />
      </main>
      <EventDetailPanel open={panelOpen} eventId={selectedId} onClose={handleClose} onNavigate={handleNavigate} />
    </div>
  );
}
