"use client";
import {
  IconMusic, IconPiano, IconMasksTheater, IconYoga, IconWind,
  IconTent, IconTheater, IconFeather, IconMoodSmile, IconQuote,
  IconPresentation, IconFrame, IconMovie, IconCircleDotted,
} from "@tabler/icons-react";

function BalletShoeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 396.625 396.625" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M298.469,164.473c-1.294-1.694-15.211-19.36-34.74-22.511l-25.375-25.374L202.745,5.217c-1.101-3.442-4.455-5.536-7.912-5.177c-0.253-0.025-0.51-0.039-0.77-0.039c-4.142,0-7.5,3.357-7.5,7.5v129.454h-80.406V7.501c0-4.143-3.358-7.5-7.5-7.5c-4.142,0-7.5,3.357-7.5,7.5v230.821c0,0.145,0.014,0.288,0.022,0.432c-0.007,0.103-0.008,0.207-0.011,0.312c-0.003,0.072-0.011,0.145-0.011,0.219c0,3.308,0.175,6.58,0.499,9.807c1.598,27.648,7.457,107.592,23.229,143.08c1.204,2.709,3.89,4.454,6.854,4.454h24.621h24.621c2.964,0,5.65-1.745,6.854-4.454c1.915-4.309,3.682-9.275,5.314-14.711l10.879,15.9c1.398,2.043,3.714,3.265,6.19,3.265h27.699c4.142,0,7.5-3.357,7.5-7.5c0-78.504,44.317-153.455,63.37-182.035C310.883,188.947,303.904,171.336,298.469,164.473z" />
    </svg>
  );
}

const TYPE_ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  music: IconMusic, classical: IconPiano, opera: IconMasksTheater,
  dance: IconYoga, circus: IconTent, theatre: IconTheater,
  cabaret: IconFeather, comedy: IconMoodSmile, spoken_word: IconQuote,
  talk: IconPresentation, exhibition: IconFrame, screening: IconMovie,
  other: IconCircleDotted,
};

export default function EventTypeIcon({ type, size = 18 }: { type: string; size?: number }) {
  if (type === "ballet") return <BalletShoeIcon size={size} />;
  const Icon = TYPE_ICONS[type] ?? IconCircleDotted;
  return <Icon size={size} strokeWidth={1.5} />;
}
