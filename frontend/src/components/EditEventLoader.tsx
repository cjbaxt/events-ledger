import { useState, useEffect } from "react";
import { fetchEvent } from "../lib/api";
import type { EventDetail } from "../lib/api";
import AddEvent from "./AddEvent";
import { url } from "../lib/base";

export default function EditEventLoader() {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) { setError("No event ID provided."); return; }
    fetchEvent(id).then(setEvent).catch(() => setError("Could not load event."));
  }, []);

  if (error) return (
    <div className="text-sm text-red-400 pt-8">
      {error} <a href={url("/")} className="underline">Go home</a>
    </div>
  );

  if (!event) return <div className="text-sm text-neutral-400 pt-8">Loading…</div>;

  return <AddEvent initialEvent={event} />;
}
