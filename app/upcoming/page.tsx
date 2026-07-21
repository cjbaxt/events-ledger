"use client";
import { useState, useCallback } from "react";
import Nav from "@/components/Nav";
import Upcoming from "@/components/Upcoming";
import EventDetailPanel from "@/components/EventDetailPanel";

export default function UpcomingPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const handleEventClick = useCallback((id: string) => { setSelectedId(id); setPanelOpen(true); }, []);
  const handleClose = useCallback(() => setPanelOpen(false), []);
  const handleNavigate = useCallback((id: string) => { setSelectedId(id); setPanelOpen(true); }, []);

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-24 md:pt-20 md:pb-8">
        <Upcoming onEventClick={handleEventClick} />
      </main>
      <EventDetailPanel open={panelOpen} eventId={selectedId} onClose={handleClose} onNavigate={handleNavigate} />
    </div>
  );
}
