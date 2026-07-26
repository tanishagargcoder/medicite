"use client";

import { useState } from "react";
import { copyAnswer, downloadMarkdown, exportPdf, type ExportableTurn } from "@/lib/export";

export default function AnswerActions({ turn }: { turn: ExportableTurn }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyAnswer(turn);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the download options still work */
    }
  };

  return (
    <div className="mt-3.5 flex items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-700">
      <Action onClick={handleCopy} label={copied ? "Copied" : "Copy"} active={copied}>
        {copied ? (
          <path d="M20 6 9 17l-5-5" />
        ) : (
          <>
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </>
        )}
      </Action>

      <Action onClick={() => exportPdf(turn)} label="PDF">
        <>
          <path d="M14 3v4a1 1 0 0 0 1 1h4" />
          <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
          <path d="M12 12v5M9.5 14.5 12 17l2.5-2.5" />
        </>
      </Action>

      <Action onClick={() => downloadMarkdown(turn)} label="Markdown">
        <>
          <path d="M12 15V3M7 10l5 5 5-5" />
          <path d="M4 21h16" />
        </>
      </Action>
    </div>
  );
}

function Action({
  onClick,
  label,
  active,
  children,
}: {
  onClick: () => void;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-clinical-100 text-clinical-700 dark:bg-clinical-500/20 dark:text-clinical-300"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-3.5 w-3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
      {label}
    </button>
  );
}
