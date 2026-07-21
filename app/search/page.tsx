"use client";
import { useState, useCallback } from "react";
import Nav from "@/components/Nav";
import Search from "@/components/Search";
import EventDetailPanel from "@/components/EventDetailPanel";

export default function SearchPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const handleEventClick = useCallback((id: string) => { setSelectedId(id); setPanelOpen(true); }, []);
  const handleClose = useCallback(() => setPanelOpen(false), []);
  const handleNavigate = useCallback((id: string) => { setSelectedId(id); setPanelOpen(true); }, []);
  return (
    <div className="min-h-screen bg-neutral-50">
      <Nav />
      <main className="pt-14 pb-20 md:pb-8 max-w-2xl mx-auto px-4 py-6 md:py-10">
        <Search
          onEventClick={handleEventClick}
          onEntityClick={() => {}}
          onVenueClick={() => {}}
          onFestivalClick={() => {}}
        />
      </main>
      <EventDetailPanel open={panelOpen} eventId={selectedId} onClose={handleClose} onNavigate={handleNavigate} />
    </div>
  );
}
