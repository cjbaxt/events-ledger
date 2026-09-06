"use client";
import { useState } from "react";
import type { ScrapeCard, ScrapeResult } from "@/app/api/scrape/nob/route";

function groupBySection(cards: ScrapeCard[]): Map<string, ScrapeCard[]> {
  const map = new Map<string, ScrapeCard[]>();
  for (const c of cards) {
    if (!map.has(c.section)) map.set(c.section, []);
    map.get(c.section)!.push(c);
  }
  return map;
}

export default function NobProgrammeFetcher({ eventId, onDone }: { eventId: string; onDone: () => void }) {
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [included, setIncluded] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function fetchProgramme() {
    if (!url.trim()) return;
    setFetching(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/scrape/nob", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Fetch failed"); return; }
      if (!data.cards?.length) { setError("No programme entries found on this page."); return; }
      setResult(data as ScrapeResult);
      setIncluded(new Set((data as ScrapeResult).cards.map((_, i) => i).filter((i) => (data as ScrapeResult).cards[i].includeByDefault)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setFetching(false);
    }
  }

  async function applyCredits() {
    if (!result) return;
    setSaving(true); setError(null);
    try {
      // Step 1: ensure all persons exist, collect IDs
      const entityIds: Map<number, { id: string; isEnsemble: boolean }> = new Map();

      for (let i = 0; i < result.cards.length; i++) {
        if (!included.has(i)) continue;
        const card = result.cards[i];

        if (card.isEnsemble) {
          if (card.existingEnsembleId) {
            entityIds.set(i, { id: card.existingEnsembleId, isEnsemble: true });
          }
          // Skip ensembles not in DB (can't create them here)
          continue;
        }

        if (card.existingPersonId) {
          entityIds.set(i, { id: card.existingPersonId, isEnsemble: false });
        } else {
          const createRes = await fetch("/api/persons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: card.name }),
          });
          if (!createRes.ok) {
            const d = await createRes.json();
            throw new Error(`Failed to create person "${card.name}": ${d.error ?? createRes.status}`);
          }
          const p = await createRes.json();
          entityIds.set(i, { id: p.id, isEnsemble: false });
        }
      }

      // Step 2: assign vocab roles to persons where needed
      for (let i = 0; i < result.cards.length; i++) {
        if (!included.has(i)) continue;
        const card = result.cards[i];
        if (card.isEnsemble || !card.personVocabRole) continue;
        const entity = entityIds.get(i);
        if (!entity) continue;
        if (card.existingPersonRoles.includes(card.personVocabRole)) continue;
        const newRoles = [...card.existingPersonRoles, card.personVocabRole];
        await fetch(`/api/persons/${entity.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roles: newRoles }),
        });
      }

      // Step 3: create event_credit rows
      const includedIdxs = [...included].filter((i) => entityIds.has(i));
      for (let rank = 0; rank < includedIdxs.length; rank++) {
        const i = includedIdxs[rank];
        const card = result.cards[i];
        const entity = entityIds.get(i)!;
        const creditBody: Record<string, unknown> = {
          event_id: eventId,
          role: card.creditRole,
          is_main: rank === 0,
          sort_order: rank,
        };
        if (entity.isEnsemble) {
          creditBody.ensemble_id = entity.id;
        } else {
          creditBody.person_id = entity.id;
        }
        if (card.note) creditBody.note = card.note;

        const creditRes = await fetch("/api/credits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(creditBody),
        });
        if (!creditRes.ok) {
          const d = await creditRes.json();
          throw new Error(`Failed to save credit for "${card.name}": ${d.error ?? creditRes.status}`);
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

  if (done) return <p className="text-xs text-green-600 py-2">Credits added ✓</p>;

  const sections = result ? groupBySection(result.cards) : null;
  const selectedCount = included.size;

  return (
    <div className="mt-4 border border-neutral-200 rounded-xl p-4 space-y-3">
      <p className="text-[10px] uppercase tracking-widest text-neutral-400">Fetch NOB programme</p>

      {!result && (
        <div className="flex gap-2">
          <input
            value={url} onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") fetchProgramme(); }}
            placeholder="https://www.operaballet.nl/en/dutch-national-opera/…"
            className="flex-1 min-w-0 border border-neutral-200 rounded-lg px-3 py-1.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-400"
          />
          <button onClick={fetchProgramme} disabled={fetching || !url.trim()}
            className="text-xs bg-neutral-900 text-white rounded-lg px-3 py-1.5 disabled:opacity-40 whitespace-nowrap flex-shrink-0">
            {fetching ? "Fetching…" : "Fetch"}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {result && sections && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-600 font-medium">{result.pageTitle}</span>
            <button onClick={() => { setResult(null); setUrl(""); setIncluded(new Set()); setError(null); }}
              className="text-[11px] text-neutral-400 hover:text-neutral-600">Change URL</button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {[...sections.entries()].map(([section, cards]) => (
              <div key={section}>
                <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1.5">{section}</p>
                <div className="space-y-1">
                  {cards.map((card) => {
                    const globalIdx = result.cards.indexOf(card);
                    const isOn = included.has(globalIdx);
                    const isNew = card.isEnsemble ? !card.existingEnsembleId : !card.existingPersonId;
                    const cantAdd = card.isEnsemble && !card.existingEnsembleId;
                    return (
                      <label key={globalIdx} className={`flex items-start gap-2.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors ${isOn ? "bg-neutral-50" : "opacity-50"} ${cantAdd ? "opacity-30 cursor-default" : ""}`}>
                        <input type="checkbox" checked={isOn} disabled={cantAdd}
                          onChange={() => {
                            if (cantAdd) return;
                            setIncluded((prev) => {
                              const n = new Set(prev);
                              n.has(globalIdx) ? n.delete(globalIdx) : n.add(globalIdx);
                              return n;
                            });
                          }}
                          className="mt-0.5 flex-shrink-0 accent-neutral-900" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-neutral-900 block truncate">{card.name}</span>
                          <span className="text-xs text-neutral-400">
                            {card.creditRole}{card.note ? ` · ${card.note}` : ""}
                            {isNew && !cantAdd && <span className="ml-1.5 text-[10px] text-amber-500 uppercase tracking-wide">new</span>}
                            {cantAdd && <span className="ml-1.5 text-[10px] text-neutral-300 uppercase tracking-wide">not in db</span>}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
            <span className="text-xs text-neutral-400">{selectedCount} selected</span>
            <button onClick={applyCredits} disabled={saving || selectedCount === 0}
              className="text-xs bg-neutral-900 text-white rounded-lg px-3 py-1.5 disabled:opacity-40">
              {saving ? "Saving…" : `Add ${selectedCount} credit${selectedCount !== 1 ? "s" : ""}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
