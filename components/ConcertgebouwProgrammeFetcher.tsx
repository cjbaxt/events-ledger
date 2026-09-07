"use client";
import { useState } from "react";
import type { CgResult, CgMusician, CgWork } from "@/app/api/scrape/concertgebouw/route";

export default function ConcertgebouwProgrammeFetcher({
  eventId, onDone,
}: {
  eventId: string; onDone: () => void;
}) {
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [result, setResult] = useState<CgResult | null>(null);
  const [includedWorks, setIncludedWorks] = useState<Set<number>>(new Set());
  const [includedMusicians, setIncludedMusicians] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function fetchProgramme() {
    if (!url.trim()) return;
    setFetching(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/scrape/concertgebouw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Fetch failed"); return; }
      const r = data as CgResult;
      setResult(r);
      setIncludedWorks(new Set(r.works.map((_, i) => i)));
      setIncludedMusicians(new Set(r.musicians.map((_, i) => i).filter((i) => r.musicians[i].includeByDefault)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setFetching(false);
    }
  }

  async function applyAll() {
    if (!result) return;
    setSaving(true); setError(null);
    try {
      // ── Works → programme items ────────────────────────────────────────────
      for (let wi = 0; wi < result.works.length; wi++) {
        if (!includedWorks.has(wi)) continue;
        const work = result.works[wi];
        const body: Record<string, unknown> = {
          musical_piece_id: work.existingPieceId,
          piece_title: work.existingPieceId ? undefined : work.title,
          composer_id: work.existingComposerId,
          composer_text: work.existingComposerId ? undefined : work.composerSurname,
          order: wi + 1,
        };
        const pr = await fetch(`/api/events/${eventId}/programme`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!pr.ok) {
          const d = await pr.json();
          throw new Error(`Failed to add work "${work.title}": ${d.error ?? pr.status}`);
        }
      }

      // ── Musicians → credits ────────────────────────────────────────────────
      const selectedIdxs = [...includedMusicians].sort((a, b) => a - b);
      for (let rank = 0; rank < selectedIdxs.length; rank++) {
        const i = selectedIdxs[rank];
        const m = result.musicians[i];

        // Create person if not in DB and not ensemble
        let personId = m.existingPersonId;
        let ensembleId = m.existingEnsembleId;

        if (!m.isEnsemble && !personId) {
          const cr = await fetch("/api/persons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: m.name }),
          });
          if (!cr.ok) throw new Error(`Failed to create person "${m.name}"`);
          personId = (await cr.json()).id;
        }

        // Skip ensembles not in DB (can't auto-create ensembles safely)
        if (m.isEnsemble && !ensembleId) continue;

        const body: Record<string, unknown> = {
          event_id: eventId,
          role: m.creditRole,
          is_main: rank === 0,
          sort_order: rank,
        };
        if (m.isEnsemble) body.ensemble_id = ensembleId;
        else body.person_id = personId;

        const cr = await fetch("/api/credits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!cr.ok) {
          const d = await cr.json();
          throw new Error(`Failed to save credit for "${m.name}": ${d.error ?? cr.status}`);
        }
      }

      setDone(true);
      setTimeout(onDone, 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function toggleWork(i: number) {
    setIncludedWorks((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }
  function toggleMusician(i: number) {
    setIncludedMusicians((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }

  if (done) return <p className="text-xs text-green-600 py-2">Programme saved ✓</p>;

  const cantAdd = (m: CgMusician) => m.isEnsemble && !m.existingEnsembleId;

  return (
    <div className="mt-4 border border-neutral-200 rounded-xl p-4 space-y-3">
      <p className="text-[10px] uppercase tracking-widest text-neutral-400">Fetch Concertgebouw programme</p>

      {!result && (
        <div className="flex gap-2">
          <input
            value={url} onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") fetchProgramme(); }}
            placeholder="https://www.concertgebouw.nl/concerten/…"
            className="flex-1 min-w-0 border border-neutral-200 rounded-lg px-3 py-1.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-400"
          />
          <button onClick={fetchProgramme} disabled={fetching || !url.trim()}
            className="text-xs bg-neutral-900 text-white rounded-lg px-3 py-1.5 disabled:opacity-40 whitespace-nowrap flex-shrink-0">
            {fetching ? "Fetching…" : "Fetch"}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {result && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-600 font-medium">{result.pageTitle}</span>
            <button onClick={() => { setResult(null); setUrl(""); setError(null); }}
              className="text-[11px] text-neutral-400 hover:text-neutral-600">Change URL</button>
          </div>

          <div className="space-y-4 max-h-[32rem] overflow-y-auto pr-1">
            {result.works.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1.5">Works</p>
                <div className="space-y-1">
                  {result.works.map((work: CgWork, wi: number) => {
                    const isOn = includedWorks.has(wi);
                    return (
                      <label key={wi} className={`flex items-start gap-2.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors ${isOn ? "bg-neutral-50" : "opacity-50"}`}>
                        <input type="checkbox" checked={isOn} onChange={() => toggleWork(wi)}
                          className="mt-0.5 flex-shrink-0 accent-neutral-900" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-neutral-900 block truncate">{work.title}</span>
                          <span className="text-xs text-neutral-400">
                            {work.composerFullName ?? work.composerSurname}
                            {!work.existingPieceId && <span className="ml-1.5 text-[10px] text-amber-500 uppercase tracking-wide">new</span>}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {result.musicians.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1.5">Musici</p>
                <div className="space-y-1">
                  {result.musicians.map((m: CgMusician, mi: number) => {
                    const isOn = includedMusicians.has(mi);
                    const disabled = cantAdd(m);
                    const isNew = m.isEnsemble ? !m.existingEnsembleId : !m.existingPersonId;
                    return (
                      <label key={mi} className={`flex items-start gap-2.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors ${isOn ? "bg-neutral-50" : "opacity-50"} ${disabled ? "opacity-30 cursor-default" : ""}`}>
                        <input type="checkbox" checked={isOn} disabled={disabled}
                          onChange={() => { if (!disabled) toggleMusician(mi); }}
                          className="mt-0.5 flex-shrink-0 accent-neutral-900" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-neutral-900 block truncate">{m.name}</span>
                          <span className="text-xs text-neutral-400">
                            {m.creditRole}
                            {isNew && !disabled && <span className="ml-1.5 text-[10px] text-amber-500 uppercase tracking-wide">new</span>}
                            {disabled && <span className="ml-1.5 text-[10px] text-neutral-300 uppercase tracking-wide">not in db</span>}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
            <span className="text-xs text-neutral-400">
              {includedWorks.size} work{includedWorks.size !== 1 ? "s" : ""}, {includedMusicians.size} credit{includedMusicians.size !== 1 ? "s" : ""}
            </span>
            <button onClick={applyAll} disabled={saving || (includedWorks.size === 0 && includedMusicians.size === 0)}
              className="text-xs bg-neutral-900 text-white rounded-lg px-3 py-1.5 disabled:opacity-40">
              {saving ? "Saving…" : "Save programme"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
