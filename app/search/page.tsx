"use client";
import { useState, useCallback } from "react";
import Nav from "@/components/Nav";
import Search from "@/components/Search";
import EventDetailPanel from "@/components/EventDetailPanel";

type NavKind = "person" | "venue" | "ensemble" | "festival" | "payment_method";
type DirectTarget = { kind: NavKind; id: string; hint?: string } | null;

export default function SearchPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [directTarget, setDirectTarget] = useState<DirectTarget>(null);

  const handleEventClick = useCallback((id: string) => {
    setDirectTarget(null);
    setSelectedId(id);
    setPanelOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setPanelOpen(false);
    setDirectTarget(null);
  }, []);

  const handleNavigate = useCallback((id: string) => {
    setDirectTarget(null);
    setSelectedId(id);
    setPanelOpen(true);
  }, []);

  const handleEntityClick = useCallback((id: string, kind: "person" | "ensemble") => {
    setSelectedId(null);
    setDirectTarget({ kind, id });
    setPanelOpen(true);
  }, []);

  const handleVenueClick = useCallback((id: string) => {
    setSelectedId(null);
    setDirectTarget({ kind: "venue", id });
    setPanelOpen(true);
  }, []);

  const handleFestivalClick = useCallback((id: string) => {
    setSelectedId(null);
    setDirectTarget({ kind: "festival", id });
    setPanelOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50">
      <Nav />
      <main className="pt-14 pb-20 md:pb-8 max-w-2xl mx-auto px-4 py-6 md:py-10">
        <Search
          onEventClick={handleEventClick}
          onEntityClick={handleEntityClick}
          onVenueClick={handleVenueClick}
          onFestivalClick={handleFestivalClick}
        />
      </main>
      <EventDetailPanel
        open={panelOpen}
        eventId={selectedId}
        onClose={handleClose}
        onNavigate={handleNavigate}
        directTarget={directTarget}
      />
    </div>
  );
}
