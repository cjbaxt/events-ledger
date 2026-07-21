"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Nav from "@/components/Nav";
import AddEvent from "@/components/AddEvent";
import { fetchEvent } from "@/lib/api";
import type { EventDetail } from "@/lib/types";

function EditInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) { setError("No event ID provided"); setLoading(false); return; }
    fetchEvent(id).then(setEvent).catch(() => setError("Event not found")).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64 text-neutral-300 text-xs uppercase tracking-widest">Loading…</div>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!event) return null;
  return <AddEvent initialEvent={event} />;
}

export default function EditPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Nav />
      <main className="pt-14 pb-20 md:pb-8 max-w-lg mx-auto px-4 py-6 md:py-10">
        <Suspense fallback={<div className="flex items-center justify-center h-64 text-neutral-300 text-xs uppercase tracking-widest">Loading…</div>}>
          <EditInner />
        </Suspense>
      </main>
    </div>
  );
}
