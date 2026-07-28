"use client";

import { useEffect, useState } from "react";

export type Mode = "light" | "dark";
export type AccentId = "indigo" | "violet" | "blue" | "emerald" | "rose";

const MODE_KEY = "medicite_mode";
const ACCENT_KEY = "medicite_accent";

/** Each accent is the full 50–800 scale as "R G B" triplets, so Tailwind's
 *  `clinical-*` classes (wired to CSS vars) re-theme the whole app instantly. */
export const ACCENTS: Record<AccentId, { label: string; swatch: string; scale: string[] }> = {
  indigo: {
    label: "Indigo",
    swatch: "#4f46e5",
    scale: ["238 242 255", "224 231 255", "199 210 254", "165 180 252", "129 140 248", "79 70 229", "67 56 202", "55 48 163", "49 46 129"],
  },
  violet: {
    label: "Violet",
    swatch: "#7c3aed",
    scale: ["245 243 255", "237 233 254", "221 214 254", "196 181 253", "167 139 250", "124 58 237", "109 40 217", "91 33 182", "76 29 149"],
  },
  blue: {
    label: "Blue",
    swatch: "#2563eb",
    scale: ["239 246 255", "219 234 254", "191 219 254", "147 197 253", "96 165 250", "37 99 235", "29 78 216", "30 64 175", "30 58 138"],
  },
  emerald: {
    label: "Emerald",
    swatch: "#10b981",
    scale: ["236 253 245", "209 250 229", "167 243 208", "110 231 183", "52 211 153", "16 185 129", "5 150 105", "4 120 87", "6 95 70"],
  },
  rose: {
    label: "Rose",
    swatch: "#e11d48",
    scale: ["255 241 242", "255 228 230", "254 205 211", "253 164 175", "251 113 133", "225 29 72", "190 18 60", "159 18 57", "136 19 55"],
  },
};

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800];

function applyAccent(id: AccentId) {
  const root = document.documentElement;
  ACCENTS[id].scale.forEach((triplet, i) => {
    root.style.setProperty(`--c-${SHADES[i]}`, triplet);
  });
}

function applyMode(mode: Mode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
}

export function useTheme() {
  const [mode, setMode] = useState<Mode>("light");
  const [accent, setAccentState] = useState<AccentId>("blue");

  useEffect(() => {
    const storedMode =
      (window.localStorage.getItem(MODE_KEY) as Mode | null) ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const storedAccent = (window.localStorage.getItem(ACCENT_KEY) as AccentId | null) ?? "blue";
    setMode(storedMode);
    setAccentState(storedAccent);
    applyMode(storedMode);
    applyAccent(storedAccent);
  }, []);

  const toggleMode = () => {
    setMode((prev) => {
      const next: Mode = prev === "dark" ? "light" : "dark";
      window.localStorage.setItem(MODE_KEY, next);
      applyMode(next);
      return next;
    });
  };

  const setAccent = (id: AccentId) => {
    setAccentState(id);
    window.localStorage.setItem(ACCENT_KEY, id);
    applyAccent(id);
  };

  return { mode, accent, toggleMode, setAccent };
}
