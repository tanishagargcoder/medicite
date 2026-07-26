"use client";

import { useRef, useState } from "react";
import type { DocumentSummary, User } from "@/lib/api";

interface Props {
  user: User;
  onSignOut: () => void;
  documents: DocumentSummary[];
  activeId: string | null;
  selectedIds: Set<string>;
  uploading: boolean;
  onUpload: (file: File) => void;
  onOpen: (doc: DocumentSummary) => void;
  onToggleSelected: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function DocumentSidebar({
  user,
  onSignOut,
  documents,
  activeId,
  selectedIds,
  uploading,
  onUpload,
  onOpen,
  onToggleSelected,
  onDelete,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onUpload(file);
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="relative overflow-hidden bg-gradient-to-br from-clinical-600 to-clinical-500 px-4 py-5 text-white">
        <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-10 -left-4 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5a2 2 0 0 1 2-2h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
              <path d="M9 12h6M12 9v6" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold leading-tight tracking-tight">MediCite</h1>
            <p className="text-xs text-clinical-50/90">Grounded clinical answers</p>
          </div>
        </div>
      </div>

      <div className="p-3">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`group cursor-pointer rounded-xl border-2 border-dashed px-3 py-6 text-center transition ${
            dragging
              ? "border-clinical-500 bg-clinical-50 scale-[1.01]"
              : "border-slate-300 bg-gradient-to-b from-slate-50 to-white hover:border-clinical-400 hover:from-clinical-50"
          }`}
        >
          <div
            className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full text-white transition ${
              uploading
                ? "bg-clinical-400"
                : "bg-gradient-to-br from-clinical-500 to-clinical-400 group-hover:scale-110"
            }`}
          >
            {uploading ? (
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />
              </svg>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-700">
            {uploading ? "Processing…" : "Upload a record"}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {uploading ? "Extracting · chunking · embedding" : "PDF or DOCX · drag or click"}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {documents.length === 0 ? (
          <p className="px-1 py-4 text-xs text-slate-500">
            No documents yet. Upload a discharge summary, lab report, or paper to start
            asking questions.
          </p>
        ) : (
          <>
            <p className="px-1 pb-2 pt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Documents
            </p>
            <ul className="space-y-1">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className={`group rounded-lg border px-2 py-2 transition ${
                    activeId === doc.id
                      ? "border-clinical-300 bg-clinical-50 shadow-sm"
                      : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(doc.id)}
                      onChange={() => onToggleSelected(doc.id)}
                      title="Include in search scope"
                      className="mt-2 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-clinical-500 focus:ring-clinical-500"
                    />
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition ${
                        activeId === doc.id
                          ? "bg-clinical-500 text-white"
                          : "bg-slate-100 text-slate-500 group-hover:bg-clinical-100 group-hover:text-clinical-600"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                        <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
                      </svg>
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpen(doc)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm text-slate-800" title={doc.filename}>
                        {doc.filename}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {doc.page_count} pages · {doc.chunk_count} chunks
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(doc.id)}
                      title="Delete document"
                      className="shrink-0 text-xs text-slate-400 opacity-0 transition hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="px-1 pt-3 text-xs text-slate-400">
              {selectedIds.size === 0
                ? "Searching all documents."
                : `Searching ${selectedIds.size} selected.`}
            </p>
          </>
        )}
      </div>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-clinical-100 text-sm font-bold uppercase text-clinical-700">
            {(user.name || user.email).charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            title="Sign out"
            className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
        <p className="mt-1 px-2 text-[11px] leading-snug text-slate-400">
          Not medical advice — verify against the cited source.
        </p>
      </div>
    </aside>
  );
}
