"use client";
import { useState } from "react";
import type { ScrapeCard, ScrapeResult, ScrapeWork } from "@/app/api/scrape/nob/route";

function groupBySection(cards: ScrapeCard[]): Map<string, ScrapeCard[]> {
  const map = new Map<string, ScrapeCard[]>();
  for (const c of cards) {
    if (!map.has(c.section)) map.set(c.section, []);
    map.get(c.section)!.push(c);
  }
  return map;
}

const WORK_TYPES = ["opera", "ballet", "classical"];

export default function NobProgrammeFetcher({
  eventId, eventType, onDone,
}: {
  eventId: string; eventType: string; onDone: () => void;
}) {
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [includedCards, setIncludedCards] = useState<Set<number>>(new Set());
  const [includedWorks, setIncludedWorks] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const showWorks = WORK_TYPES.includes(eventType);

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
      const r = data as ScrapeResult;
      if (!r.cards?.length && !r.works?.length) {
        setError("No programme entries found on this page."); return;
      }
      setResult(r);
      setIncludedCards(new Set(r.cards.map((_, i) => i).filter((i) => r.cards[i].includeByDefault)));
      setIncludedWorks(new Set(r.works.map((_, i) => i))); // all works checked by default
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
      // ── Works ──────────────────────────────────────────────────────────────
      if (showWorks) {
        for (let wi = 0; wi < result.works.length; wi++) {
          if (!includedWorks.has(wi)) continue;
          const work = result.works[wi];

          // Ensure composer person exists
          let composerId = work.existingComposerId;
          if (work.composerName && !composerId) {
            const cr = await fetch("/api/persons", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: work.composerName }),
            });
            if (!cr.ok) throw new Error(`Failed to create composer "${work.composerName}"`);
            composerId = (await cr.json()).id;
          }

          // Create programme item (creates piece inline if needed)
          const pr = await fetch(`/api/events/${eventId}/programme`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              musical_piece_id: work.existingPieceId,
              piece_title: work.existingPieceId ? undefined : work.title,
              composer_id: composerId,
              order: wi + 1,
            }),
          });
          if (!pr.ok) {
            const d = await pr.json();
            throw new Error(`Failed to add work "${work.title}": ${d.error ?? pr.status}`);
          }
        }
      }

      // ── Credits ────────────────────────────────────────────────────────────
      const entityIds = new Map<number, { id: string; isEnsemble: boolean }>();

      for (let i = 0; i < result.cards.length; i++) {
        if (!includedCards.has(i)) continue;
        const card = result.cards[i];

        if (card.isEnsemble) {
          if (card.existingEnsembleId) entityIds.set(i, { id: card.existingEnsembleId, isEnsemble: true });
          continue;
        }

        if (card.existingPersonId) {
          entityIds.set(i, { id: card.existingPersonId, isEnsemble: false });
        } else {
          const cr = await fetch("/api/persons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: card.name }),
          });
          if (!cr.ok) throw new Error(`Failed to create person "${card.name}"`);
          entityIds.set(i, { id: (await cr.json()).id, isEnsemble: false });
        }
      }

      // Assign vocab roles
      for (let i = 0; i < result.cards.length; i++) {
        if (!includedCards.has(i)) continue;
        const card = result.cards[i];
        if (card.isEnsemble || !card.personVocabRole) continue;
        const entity = entityIds.get(i);
        if (!entity || card.existingPersonRoles.includes(card.personVocabRole)) continue;
        await fetch(`/api/persons/${entity.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roles: [...card.existingPersonRoles, card.personVocabRole] }),
        });
      }

      // Create credits
      const includedIdxs = [...includedCards].filter((i) => entityIds.has(i));
      for (let rank = 0; rank < includedIdxs.length; rank++) {
        const i = includedIdxs[rank];
        const card = result.cards[i];
        const entity = entityIds.get(i)!;
        const body: Record<string, unknown> = {
          event_id: eventId,
          role: card.creditRole,
          is_main: rank === 0,
          sort_order: rank,
        };
        if (entity.isEnsemble) body.ensemble_id = entity.id;
        else body.person_id = entity.id;
        if (card.note) body.note = card.note;

        const creditRes = await fetch("/api/credits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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

  if (done) return <p className="text-xs text-green-600 py-2">Programme saved ✓</p>;

  const sections = result ? groupBySection(result.cards) : null;
  const selectedCards = includedCards.size;
  const selectedWorks = includedWorks.size;
  const totalSelected = selectedCards + (showWorks ? selectedWorks : 0);

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
            <button onClick={() => { setResult(null); setUrl(""); setIncludedCards(new Set()); setIncludedWorks(new Set()); setError(null); }}
              className="text-[11px] text-neutral-400 hover:text-neutral-600">Change URL</button>
          </div>

          <div className="space-y-4 max-h-[32rem] overflow-y-auto pr-1">
            {/* Works */}
            {showWorks && result.works.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1.5">Works</p>
                <div className="space-y-1">
                  {result.works.map((work, wi) => {
                    const isOn = includedWorks.has(wi);
                    return (
                      <label key={wi} className={`flex items-start gap-2.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors ${isOn ? "bg-neutral-50" : "opacity-50"}`}>
                        <input type="checkbox" checked={isOn}
                          onChange={() => setIncludedWorks((prev) => { const n = new Set(prev); n.has(wi) ? n.delete(wi) : n.add(wi); return n; })}
                          className="mt-0.5 flex-shrink-0 accent-neutral-900" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-neutral-900 block truncate">{work.title}</span>
                          <span className="text-xs text-neutral-400">
                            {work.composerName ?? "composer unknown"}
                            {!work.existingPieceId && <span className="ml-1.5 text-[10px] text-amber-500 uppercase tracking-wide">new</span>}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Credits */}
            {[...sections.entries()].map(([section, cards]) => (
              <div key={section}>
                <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1.5">{section}</p>
                <div className="space-y-1">
                  {cards.map((card) => {
                    const globalIdx = result.cards.indexOf(card);
                    const isOn = includedCards.has(globalIdx);
                    const isNew = card.isEnsemble ? !card.existingEnsembleId : !card.existingPersonId;
                    const cantAdd = card.isEnsemble && !card.existingEnsembleId;
                    return (
                      <label key={globalIdx} className={`flex items-start gap-2.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors ${isOn ? "bg-neutral-50" : "opacity-50"} ${cantAdd ? "opacity-30 cursor-default" : ""}`}>
                        <input type="checkbox" checked={isOn} disabled={cantAdd}
                          onChange={() => {
                            if (cantAdd) return;
                            setIncludedCards((prev) => { const n = new Set(prev); n.has(globalIdx) ? n.delete(globalIdx) : n.add(globalIdx); return n; });
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
            <span className="text-xs text-neutral-400">
              {showWorks && result.works.length > 0 ? `${selectedWorks} work${selectedWorks !== 1 ? "s" : ""}, ` : ""}
              {selectedCards} credit{selectedCards !== 1 ? "s" : ""}
            </span>
            <button onClick={applyAll} disabled={saving || totalSelected === 0}
              className="text-xs bg-neutral-900 text-white rounded-lg px-3 py-1.5 disabled:opacity-40">
              {saving ? "Saving…" : "Save programme"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
