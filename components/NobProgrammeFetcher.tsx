"use client";
import { useState } from "react";
import type { ScrapeCard, ScrapeResult, ScrapeWork } from "@/app/api/scrape/nob/route";

function groupBySection(cards: ScrapeCard[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (let i = 0; i < cards.length; i++) {
    const section = cards[i].section;
    if (!map.has(section)) map.set(section, []);
    map.get(section)!.push(i);
  }
  return map;
}

const WORK_TYPES = ["opera", "ballet", "classical"];

const EMPTY_ADD_CARD = { name: "", creditRole: "", note: "", section: "Production" };
const EMPTY_ADD_WORK = { title: "", composerName: "" };

export default function NobProgrammeFetcher({
  eventId, eventType, onDone,
}: {
  eventId: string; eventType: string; onDone: () => void;
}) {
  const [url, setUrl] = useState("");
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [fetching, setFetching] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [includedCards, setIncludedCards] = useState<Set<number>>(new Set());
  const [includedWorks, setIncludedWorks] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [addCard, setAddCard] = useState<typeof EMPTY_ADD_CARD | null>(null);
  const [addWork, setAddWork] = useState<typeof EMPTY_ADD_WORK | null>(null);

  const showWorks = WORK_TYPES.includes(eventType);

  // ── Result helpers ────────────────────────────────────────────────────────────

  function applyResult(r: ScrapeResult) {
    if (!r.cards?.length && !r.works?.length) { setError("No programme entries found on this page."); return; }
    setResult(r);
    setIncludedCards(new Set(r.cards.map((_, i) => i).filter((i) => r.cards[i].includeByDefault)));
    setIncludedWorks(new Set(r.works.map((_, i) => i)));
  }

  function patchCard(idx: number, patch: Partial<ScrapeCard>) {
    setResult((r) => r ? { ...r, cards: r.cards.map((c, i) => i === idx ? { ...c, ...patch } : c) } : r);
  }

  function deleteCard(idx: number) {
    setResult((r) => {
      if (!r) return r;
      const newCards = r.cards.filter((_, i) => i !== idx);
      const newIncluded = new Set<number>();
      let j = 0;
      for (let i = 0; i < r.cards.length; i++) {
        if (i === idx) continue;
        if (includedCards.has(i)) newIncluded.add(j);
        j++;
      }
      setIncludedCards(newIncluded);
      return { ...r, cards: newCards };
    });
  }

  function pushCard(card: ScrapeCard) {
    setResult((r) => {
      if (!r) return r;
      setIncludedCards((prev) => new Set([...prev, r.cards.length]));
      return { ...r, cards: [...r.cards, card] };
    });
  }

  function patchWork(idx: number, patch: Partial<ScrapeWork>) {
    setResult((r) => r ? { ...r, works: r.works.map((w, i) => i === idx ? { ...w, ...patch } : w) } : r);
  }

  function deleteWork(idx: number) {
    setResult((r) => {
      if (!r) return r;
      const newWorks = r.works.filter((_, i) => i !== idx);
      const newIncluded = new Set<number>();
      let j = 0;
      for (let i = 0; i < r.works.length; i++) {
        if (i === idx) continue;
        if (includedWorks.has(i)) newIncluded.add(j);
        j++;
      }
      setIncludedWorks(newIncluded);
      return { ...r, works: newWorks };
    });
  }

  function pushWork(work: ScrapeWork) {
    setResult((r) => {
      if (!r) return r;
      setIncludedWorks((prev) => new Set([...prev, r.works.length]));
      return { ...r, works: [...r.works, work] };
    });
  }

  // ── Fetch / parse ─────────────────────────────────────────────────────────────

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
      if (res.status === 403) {
        setPasteMode(true);
        setError(null);
        return;
      }
      if (!res.ok) { setError(data.error ?? "Fetch failed"); return; }
      applyResult(data as ScrapeResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setFetching(false);
    }
  }

  async function parsePasted() {
    if (!pastedText.trim()) return;
    setFetching(true); setError(null);
    try {
      const res = await fetch("/api/scrape/nob", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pastedText, pageTitle: url.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Parse failed"); return; }
      applyResult(data as ScrapeResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setFetching(false);
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────────

  async function applyAll() {
    if (!result) return;
    setSaving(true); setError(null);
    try {
      if (showWorks) {
        for (let wi = 0; wi < result.works.length; wi++) {
          if (!includedWorks.has(wi)) continue;
          const work = result.works[wi];
          let composerId = work.existingComposerId;
          if (work.composerName && !composerId) {
            const cr = await fetch("/api/persons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: work.composerName }) });
            if (!cr.ok) throw new Error(`Failed to create composer "${work.composerName}"`);
            composerId = (await cr.json()).id;
          }
          const pr = await fetch(`/api/events/${eventId}/programme`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ musical_piece_id: work.existingPieceId, piece_title: work.existingPieceId ? undefined : work.title, composer_id: composerId, order: wi + 1 }),
          });
          if (!pr.ok) { const d = await pr.json(); throw new Error(`Failed to add work "${work.title}": ${d.error ?? pr.status}`); }
        }
      }

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
          const cr = await fetch("/api/persons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: card.name }) });
          if (!cr.ok) throw new Error(`Failed to create person "${card.name}"`);
          entityIds.set(i, { id: (await cr.json()).id, isEnsemble: false });
        }
      }

      for (let i = 0; i < result.cards.length; i++) {
        if (!includedCards.has(i)) continue;
        const card = result.cards[i];
        if (card.isEnsemble || !card.personVocabRole) continue;
        const entity = entityIds.get(i);
        if (!entity || card.existingPersonRoles.includes(card.personVocabRole)) continue;
        await fetch(`/api/persons/${entity.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roles: [...card.existingPersonRoles, card.personVocabRole] }) });
      }

      const includedIdxs = [...includedCards].sort((a, b) => a - b).filter((i) => entityIds.has(i));
      for (let rank = 0; rank < includedIdxs.length; rank++) {
        const i = includedIdxs[rank];
        const card = result.cards[i];
        const entity = entityIds.get(i)!;
        const body: Record<string, unknown> = { event_id: eventId, role: card.creditRole, is_main: rank === 0, sort_order: rank };
        if (entity.isEnsemble) body.ensemble_id = entity.id;
        else body.person_id = entity.id;
        if (card.note) body.note = card.note;
        const creditRes = await fetch("/api/credits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!creditRes.ok) { const d = await creditRes.json(); throw new Error(`Failed to save credit for "${card.name}": ${d.error ?? creditRes.status}`); }
      }

      setDone(true);
      setTimeout(onDone, 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (done) return <p className="text-xs text-green-600 py-2">Programme saved ✓</p>;

  const sections = result ? groupBySection(result.cards) : null;
  const selectedCards = includedCards.size;
  const selectedWorks = includedWorks.size;
  const totalSelected = selectedCards + (showWorks ? selectedWorks : 0);

  const inputCls = "border border-neutral-200 rounded px-1.5 py-0.5 text-xs text-neutral-800 focus:outline-none focus:border-neutral-400 bg-white";

  return (
    <div className="mt-4 border border-neutral-200 rounded-xl p-4 space-y-3">
      <p className="text-[10px] uppercase tracking-widest text-neutral-400">Fetch NOB programme</p>

      {!result && !pasteMode && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") fetchProgramme(); }}
              placeholder="https://www.operaballet.nl/en/dutch-national-opera/…"
              className="flex-1 min-w-0 border border-neutral-200 rounded-lg px-3 py-1.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-400" />
            <button onClick={fetchProgramme} disabled={fetching || !url.trim()}
              className="text-xs bg-neutral-900 text-white rounded-lg px-3 py-1.5 disabled:opacity-40 whitespace-nowrap flex-shrink-0">
              {fetching ? "Fetching…" : "Fetch"}
            </button>
          </div>
          <button onClick={() => { setPasteMode(true); setError(null); }}
            className="text-[11px] text-neutral-400 hover:text-neutral-600">Paste text instead →</button>
        </div>
      )}

      {!result && pasteMode && (
        <div className="space-y-2">
          <p className="text-[10px] text-neutral-500">Open the page → select the programme/cast text → Ctrl+C → paste below. Uses two-space separators between role and name (e.g. <span className="font-mono">Choreography  Hans van Manen</span>).</p>
          <textarea value={pastedText} onChange={(e) => setPastedText(e.target.value)}
            placeholder={"Symphony in C\nChoreography  George Balanchine\nMusic  Georges Bizet\n…"}
            rows={8}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-700 font-mono focus:outline-none focus:border-neutral-400 resize-y" />
          <div className="flex gap-2">
            <button onClick={parsePasted} disabled={fetching || !pastedText.trim()}
              className="text-xs bg-neutral-900 text-white rounded-lg px-3 py-1.5 disabled:opacity-40">
              {fetching ? "Parsing…" : "Parse"}
            </button>
            <button onClick={() => { setPasteMode(false); setError(null); }} className="text-xs text-neutral-400 hover:text-neutral-600 px-2">← Back</button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {result && sections && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-600 font-medium">{result.pageTitle}</span>
            <div className="flex items-center gap-3">
              <button onClick={() => setEditMode((v) => !v)}
                className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${editMode ? "bg-neutral-900 text-white border-neutral-900" : "text-neutral-400 hover:text-neutral-600 border-neutral-200 hover:border-neutral-400"}`}>
                {editMode ? "Done editing" : "Edit"}
              </button>
              <button onClick={() => { setResult(null); setUrl(""); setPasteMode(false); setPastedText(""); setIncludedCards(new Set()); setIncludedWorks(new Set()); setError(null); setEditMode(false); setAddCard(null); setAddWork(null); }}
                className="text-[11px] text-neutral-400 hover:text-neutral-600">Change URL</button>
            </div>
          </div>

          <div className="space-y-4 max-h-[36rem] overflow-y-auto pr-1">

            {/* Works */}
            {showWorks && (result.works.length > 0 || editMode) && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1.5">Works</p>
                <div className="space-y-1">
                  {result.works.map((work, wi) => {
                    const isOn = includedWorks.has(wi);
                    return (
                      <div key={wi} className={`flex items-start gap-2.5 py-1.5 px-2 rounded-lg transition-colors ${isOn ? "bg-neutral-50" : "opacity-50"}`}>
                        <input type="checkbox" checked={isOn}
                          onChange={() => setIncludedWorks((prev) => { const n = new Set(prev); n.has(wi) ? n.delete(wi) : n.add(wi); return n; })}
                          className="mt-1 flex-shrink-0 accent-neutral-900" />
                        {editMode ? (
                          <div className="flex-1 flex flex-wrap gap-1.5 min-w-0">
                            <input value={work.title} onChange={(e) => patchWork(wi, { title: e.target.value })}
                              placeholder="Title" className={`${inputCls} flex-1 min-w-[8rem]`} />
                            <input value={work.composerName ?? ""} onChange={(e) => patchWork(wi, { composerName: e.target.value || null })}
                              placeholder="Composer" className={`${inputCls} flex-1 min-w-[8rem]`} />
                            <button onClick={() => deleteWork(wi)} className="text-neutral-300 hover:text-red-400 text-xs px-1 flex-shrink-0">×</button>
                          </div>
                        ) : (
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-neutral-900 block truncate">{work.title}</span>
                            <span className="text-xs text-neutral-400">
                              {work.composerName ?? "composer unknown"}
                              {!work.existingPieceId && <span className="ml-1.5 text-[10px] text-amber-500 uppercase tracking-wide">new</span>}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Add work row */}
                  {editMode && !addWork && (
                    <button onClick={() => setAddWork({ ...EMPTY_ADD_WORK })}
                      className="text-[11px] text-neutral-400 hover:text-neutral-600 py-1 px-2">+ Add work</button>
                  )}
                  {editMode && addWork && (
                    <div className="flex flex-wrap gap-1.5 py-1.5 px-2 bg-neutral-50 rounded-lg">
                      <input value={addWork.title} onChange={(e) => setAddWork({ ...addWork, title: e.target.value })}
                        placeholder="Title" className={`${inputCls} flex-1 min-w-[8rem]`} autoFocus />
                      <input value={addWork.composerName} onChange={(e) => setAddWork({ ...addWork, composerName: e.target.value })}
                        placeholder="Composer" className={`${inputCls} flex-1 min-w-[8rem]`} />
                      <button onClick={() => {
                        if (!addWork.title.trim()) return;
                        pushWork({ title: addWork.title.trim(), composerName: addWork.composerName.trim() || null, existingPieceId: null, existingComposerId: null });
                        setAddWork(null);
                      }} className="text-xs bg-neutral-900 text-white rounded px-2 py-0.5 disabled:opacity-40" disabled={!addWork.title.trim()}>Add</button>
                      <button onClick={() => setAddWork(null)} className="text-xs text-neutral-400 hover:text-neutral-600 px-1">Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Credits by section */}
            {[...sections.entries()].map(([section, idxs]) => (
              <div key={section}>
                <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1.5">{section}</p>
                <div className="space-y-1">
                  {idxs.map((globalIdx) => {
                    const card = result.cards[globalIdx];
                    const isOn = includedCards.has(globalIdx);
                    const isNew = card.isEnsemble ? !card.existingEnsembleId : !card.existingPersonId;
                    const cantAdd = card.isEnsemble && !card.existingEnsembleId;
                    return (
                      <div key={globalIdx} className={`flex items-start gap-2.5 py-1.5 px-2 rounded-lg transition-colors ${isOn ? "bg-neutral-50" : "opacity-50"} ${cantAdd && !editMode ? "opacity-30" : ""}`}>
                        <input type="checkbox" checked={isOn} disabled={cantAdd && !editMode}
                          onChange={() => {
                            if (cantAdd && !editMode) return;
                            setIncludedCards((prev) => { const n = new Set(prev); n.has(globalIdx) ? n.delete(globalIdx) : n.add(globalIdx); return n; });
                          }}
                          className="mt-1 flex-shrink-0 accent-neutral-900" />
                        {editMode ? (
                          <div className="flex-1 flex flex-wrap gap-1.5 min-w-0">
                            <input value={card.name} onChange={(e) => patchCard(globalIdx, { name: e.target.value })}
                              placeholder="Name" className={`${inputCls} min-w-[8rem] flex-1`} />
                            <input value={card.creditRole} onChange={(e) => patchCard(globalIdx, { creditRole: e.target.value })}
                              placeholder="Role" className={`${inputCls} min-w-[6rem] flex-1`} />
                            <input value={card.note ?? ""} onChange={(e) => patchCard(globalIdx, { note: e.target.value || null })}
                              placeholder="Note (optional)" className={`${inputCls} min-w-[8rem] flex-1`} />
                            <button onClick={() => deleteCard(globalIdx)} className="text-neutral-300 hover:text-red-400 text-xs px-1 flex-shrink-0">×</button>
                          </div>
                        ) : (
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-neutral-900 block truncate">{card.name}</span>
                            <span className="text-xs text-neutral-400">
                              {card.creditRole}{card.note ? ` · ${card.note}` : ""}
                              {isNew && !cantAdd && <span className="ml-1.5 text-[10px] text-amber-500 uppercase tracking-wide">new</span>}
                              {cantAdd && <span className="ml-1.5 text-[10px] text-neutral-300 uppercase tracking-wide">not in db</span>}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Add entry (edit mode) */}
            {editMode && !addCard && (
              <button onClick={() => setAddCard({ ...EMPTY_ADD_CARD, section: [...sections.keys()][0] ?? "Production" })}
                className="text-[11px] text-neutral-400 hover:text-neutral-600 py-1 px-2">+ Add entry</button>
            )}
            {editMode && addCard && (
              <div className="space-y-1.5 py-2 px-2 bg-neutral-50 rounded-lg">
                <p className="text-[10px] uppercase tracking-widest text-neutral-400">New entry</p>
                <div className="flex flex-wrap gap-1.5">
                  <input value={addCard.name} onChange={(e) => setAddCard({ ...addCard, name: e.target.value })}
                    placeholder="Name" className={`${inputCls} min-w-[8rem] flex-1`} autoFocus />
                  <input value={addCard.creditRole} onChange={(e) => setAddCard({ ...addCard, creditRole: e.target.value })}
                    placeholder="Role" className={`${inputCls} min-w-[6rem] flex-1`} />
                  <input value={addCard.note} onChange={(e) => setAddCard({ ...addCard, note: e.target.value })}
                    placeholder="Note (optional)" className={`${inputCls} min-w-[8rem] flex-1`} />
                  <input value={addCard.section} onChange={(e) => setAddCard({ ...addCard, section: e.target.value })}
                    placeholder="Section" className={`${inputCls} min-w-[6rem] flex-1`} list="nob-sections" />
                  <datalist id="nob-sections">{[...sections.keys()].map((s) => <option key={s} value={s} />)}</datalist>
                </div>
                <div className="flex gap-2 pt-0.5">
                  <button onClick={() => {
                    if (!addCard.name.trim() || !addCard.creditRole.trim()) return;
                    pushCard({ name: addCard.name.trim(), creditRole: addCard.creditRole.trim(), note: addCard.note.trim() || null, nobRole: addCard.creditRole.trim(), personVocabRole: null, section: addCard.section || "Production", existingPersonId: null, existingPersonRoles: [], existingEnsembleId: null, isEnsemble: false, includeByDefault: true });
                    setAddCard(null);
                  }} disabled={!addCard.name.trim() || !addCard.creditRole.trim()}
                    className="text-xs bg-neutral-900 text-white rounded px-2 py-0.5 disabled:opacity-40">Add</button>
                  <button onClick={() => setAddCard(null)} className="text-xs text-neutral-400 hover:text-neutral-600 px-1">Cancel</button>
                </div>
              </div>
            )}
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
