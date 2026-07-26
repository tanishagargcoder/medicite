"use client";

import { ACCENTS, type AccentId, type Mode } from "@/lib/theme";

interface Props {
  mode: Mode;
  accent: AccentId;
  onToggleMode: () => void;
  onSetAccent: (id: AccentId) => void;
}

export default function ThemeControls({ mode, accent, onToggleMode, onSetAccent }: Props) {
  const isDark = mode === "dark";
  return (
    <div className="flex items-center gap-3">
      {/* Accent color swatches */}
      <div className="hidden items-center gap-1.5 sm:flex">
        {(Object.keys(ACCENTS) as AccentId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onSetAccent(id)}
            aria-label={`${ACCENTS[id].label} theme`}
            title={ACCENTS[id].label}
            className={`h-5 w-5 rounded-full transition hover:scale-110 ${
              accent === id ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900" : ""
            }`}
            style={{ backgroundColor: ACCENTS[id].swatch }}
          />
        ))}
      </div>

      {/* Dark / light toggle */}
      <button
        type="button"
        onClick={onToggleMode}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        title={isDark ? "Light mode" : "Dark mode"}
        className="relative flex h-8 w-14 items-center rounded-full border border-slate-300 bg-slate-100 p-0.5 transition-colors dark:border-slate-600 dark:bg-slate-700"
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full bg-white text-clinical-600 shadow-sm transition-transform duration-300 dark:bg-slate-900 dark:text-clinical-300 ${
            isDark ? "translate-x-6" : "translate-x-0"
          }`}
        >
          {isDark ? (
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          )}
        </span>
      </button>
    </div>
  );
}
