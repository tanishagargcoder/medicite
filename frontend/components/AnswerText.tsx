"use client";

import type { Citation } from "@/lib/api";

interface Props {
  text: string;
  citations: Citation[];
  onCitationClick: (citation: Citation) => void;
}

/**
 * Renders the answer, converting every [n] marker into a clickable pill that
 * jumps the viewer to that page. This is the piece that turns a plain LLM
 * answer into something a clinician can actually verify.
 */
export default function AnswerText({ text, citations, onCitationClick }: Props) {
  const byMarker = new Map(citations.map((c) => [c.marker, c]));
  const parts = text.split(/(\[\d+\])/g);

  return (
    <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">
      {parts.map((part, index) => {
        const match = /^\[(\d+)\]$/.exec(part);
        if (!match) return <span key={index}>{part}</span>;

        const citation = byMarker.get(Number(match[1]));
        // A marker with no matching citation shouldn't happen (the API filters
        // them), but render it inert rather than as a dead link if it does.
        if (!citation) return <span key={index}>{part}</span>;

        return (
          <button
            key={index}
            type="button"
            onClick={() => onCitationClick(citation)}
            title={`${citation.filename} — page ${citation.page_number}`}
            className="mx-0.5 inline-flex items-center rounded bg-clinical-100 px-1.5 py-0.5 align-baseline text-xs font-semibold text-clinical-700 transition hover:bg-clinical-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-clinical-500 focus:ring-offset-1"
          >
            {citation.marker}
          </button>
        );
      })}
    </div>
  );
}
