import { useState, useEffect } from "react";
import {
  IconTimeline,
  IconCalendarEvent,
  IconChartBar,
  IconPlus,
  IconSearch,
  IconInfoCircle,
} from "@tabler/icons-react";
import { isEditor, lock } from "../lib/editor";

const STATIC = import.meta.env.PUBLIC_STATIC_DATA === "true";
if (STATIC && typeof localStorage !== "undefined") lock();
import { url } from "../lib/base";

const links = [
  { path: "/", href: url("/"), label: "Timeline", icon: IconTimeline },
  { path: "/upcoming", href: url("/upcoming"), label: "Upcoming", icon: IconCalendarEvent },
  { path: "/stats", href: url("/stats"), label: "Stats", icon: IconChartBar },
  { path: "/search", href: url("/search"), label: "Search", icon: IconSearch },
  { path: "/about", href: url("/about"), label: "About", icon: IconInfoCircle },
];

export default function Nav({ current }: { current: string }) {
  const [editor, setEditor] = useState(() => isEditor());
  useEffect(() => {
    function sync() { setEditor(isEditor()); }
    window.addEventListener("editor-change", sync);
    return () => window.removeEventListener("editor-change", sync);
  }, []);

  return (
    <>
      {/* Desktop top bar */}
      <header className="hidden md:flex fixed top-0 inset-x-0 z-40 h-14 border-b border-neutral-100 bg-white/90 backdrop-blur-sm items-center px-8">
        <a href={url("/")} className="font-serif text-lg tracking-tight mr-10 hover:opacity-70 transition-opacity">
          events ledger
        </a>
        <nav className="flex gap-8 flex-1">
          {links.map(({ path, href, label }) => {
            const active = current === path;
            return (
              <a
                key={href}
                href={href}
                className={`text-sm pb-0.5 transition-colors ${
                  active
                    ? "text-neutral-900 border-b border-neutral-900"
                    : "text-neutral-400 hover:text-neutral-700"
                }`}
              >
                {label}
              </a>
            );
          })}
        </nav>
        {editor && (
          <a href={url("/add")} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
            <IconPlus size={16} />
            Add event
          </a>
        )}
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 border-t border-neutral-100 bg-white/95 backdrop-blur-sm flex items-center">
        {links.map(({ path, href, label, icon: Icon }) => {
          const active = current === path;
          return (
            <a
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 pt-2 transition-colors ${
                active ? "text-neutral-900" : "text-neutral-400"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2 : 1.5} />
              <span className="text-[10px] uppercase tracking-wider">{label}</span>
            </a>
          );
        })}
        {editor && (
          <a href={url("/add")} className="flex-1 flex flex-col items-center gap-1 pt-2 text-neutral-400 hover:text-neutral-900 transition-colors">
            <IconPlus size={22} strokeWidth={1.5} />
            <span className="text-[10px] uppercase tracking-wider">Add</span>
          </a>
        )}
      </nav>
    </>
  );
}
