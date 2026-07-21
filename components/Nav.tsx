"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconTimeline, IconCalendarEvent, IconChartBar,
  IconSearch, IconPlus,
} from "@tabler/icons-react";
import { logout } from "@/app/login/actions";

const links = [
  { path: "/", label: "Timeline", icon: IconTimeline },
  { path: "/upcoming", label: "Upcoming", icon: IconCalendarEvent },
  { path: "/stats", label: "Stats", icon: IconChartBar },
  { path: "/search", label: "Search", icon: IconSearch },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop top bar */}
      <header className="hidden md:flex fixed top-0 inset-x-0 z-40 h-14 border-b border-neutral-100 bg-white/90 backdrop-blur-sm items-center px-8">
        <Link href="/" className="font-serif text-lg tracking-tight mr-10 hover:opacity-70 transition-opacity">
          events ledger
        </Link>
        <nav className="flex gap-8 flex-1">
          {links.map(({ path, label }) => (
            <Link
              key={path}
              href={path}
              className={`text-sm pb-0.5 transition-colors ${
                pathname === path
                  ? "text-neutral-900 border-b border-neutral-900"
                  : "text-neutral-400 hover:text-neutral-700"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/add" className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
            <IconPlus size={16} />
            Add event
          </Link>
          <form action={logout}>
            <button type="submit" className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 border-t border-neutral-100 bg-white/95 backdrop-blur-sm flex items-center">
        {links.map(({ path, label, icon: Icon }) => {
          const active = pathname === path;
          return (
            <Link
              key={path}
              href={path}
              className={`flex-1 flex flex-col items-center gap-1 pt-2 transition-colors ${
                active ? "text-neutral-900" : "text-neutral-400"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2 : 1.5} />
              <span className="text-[10px] uppercase tracking-wider">{label}</span>
            </Link>
          );
        })}
        <Link href="/add" className="flex-1 flex flex-col items-center gap-1 pt-2 text-neutral-400 hover:text-neutral-900 transition-colors">
          <IconPlus size={22} strokeWidth={1.5} />
          <span className="text-[10px] uppercase tracking-wider">Add</span>
        </Link>
      </nav>
    </>
  );
}
