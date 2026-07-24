export const EXTENSION_TABLE: Record<string, string> = {
  music: "event_music",
  classical: "event_classical",
  opera: "event_opera",
  ballet: "event_ballet",
  dance: "event_dance",
  circus: "event_circus",
  theatre: "event_theatre",
  cabaret: "event_cabaret",
  comedy: "event_comedy",
  spoken_word: "event_spoken_word",
  talk: "event_talk",
  exhibition: "event_exhibition",
  screening: "event_screening",
  other: "event_other",
};

export function extensionTable(type: string): string | null {
  return EXTENSION_TABLE[type] ?? null;
}
