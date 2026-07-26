"use client";

import { useEffect } from "react";
import { ACCENTS, type AccentId, type Mode } from "@/lib/theme";
import type { User } from "@/lib/api";

interface Props {
  user: User;
  mode: Mode;
  accent: AccentId;
  onToggleMode: () => void;
  onSetAccent: (id: AccentId) => void;
  onSignOut: () => void;
  onClose: () => void;
}

export default function SettingsModal({
  user,
  mode,
  accent,
  onToggleMode,
  onSetAccent,
  onSignOut,
  onClose,
}: Props) {
  const isDark = mode === "dark";

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-scale-in overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          {/* Appearance */}
          <Section title="Appearance">
            <Row label="Theme" hint="Light or dark interface">
              <button
                type="button"
                onClick={onToggleMode}
                className="relative flex h-8 w-14 items-center rounded-full border border-slate-300 bg-slate-100 p-0.5 transition-colors dark:border-slate-600 dark:bg-slate-700"
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
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
            </Row>
            <Row label="Accent color" hint="Applied across the app">
              <div className="flex items-center gap-2">
                {(Object.keys(ACCENTS) as AccentId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSetAccent(id)}
                    aria-label={`${ACCENTS[id].label} theme`}
                    title={ACCENTS[id].label}
                    className={`h-6 w-6 rounded-full transition hover:scale-110 ${
                      accent === id
                        ? "ring-2 ring-slate-400 ring-offset-2 dark:ring-slate-500 dark:ring-offset-slate-900"
                        : ""
                    }`}
                    style={{ backgroundColor: ACCENTS[id].swatch }}
                  />
                ))}
              </div>
            </Row>
          </Section>

          {/* Account */}
          <Section title="Account">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clinical-100 text-base font-bold uppercase text-clinical-700 dark:bg-clinical-500/20 dark:text-clinical-300">
                {(user.name || user.email).charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{user.name}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
            </div>
            <button
              onClick={onSignOut}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Sign out
            </button>
          </Section>

          {/* About */}
          <Section title="About">
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-800 dark:text-slate-100">MediCite</span> answers
              questions about your uploaded medical documents — grounded in the source, with clickable
              page-level citations. It uses two-stage retrieval and never guesses when the documents
              don&apos;t contain the answer.
            </p>
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              Not a medical device. Summarizes uploaded documents only — not medical advice. Always
              verify against the cited source.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
        {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      </div>
      {children}
    </div>
  );
}
