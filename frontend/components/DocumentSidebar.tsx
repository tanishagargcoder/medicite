"use client";

import { useRef, useState } from "react";
import type { DocumentSummary } from "@/lib/api";

interface Props {
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
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-clinical-500 text-white shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5a2 2 0 0 1 2-2h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
              <path d="M9 12h6M12 9v6" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold leading-tight text-slate-900">MediCite</h1>
            <p className="text-xs text-slate-500">Grounded answers from your records</p>
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
          className={`cursor-pointer rounded-lg border-2 border-dashed px-3 py-5 text-center transition ${
            dragging
              ? "border-clinical-500 bg-clinical-50"
              : "border-slate-300 bg-slate-50 hover:border-clinical-500"
          }`}
        >
          <p className="text-sm font-medium text-slate-700">
            {uploading ? "Processing…" : "Upload a record"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {uploading ? "Extracting, chunking, embedding" : "PDF or DOCX · drag or click"}
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
                  className={`group rounded-md border px-2 py-2 transition ${
                    activeId === doc.id
                      ? "border-clinical-500 bg-clinical-50"
                      : "border-transparent hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(doc.id)}
                      onChange={() => onToggleSelected(doc.id)}
                      title="Include in search scope"
                      className="mt-1 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-clinical-500 focus:ring-clinical-500"
                    />
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

      <div className="border-t border-slate-200 px-4 py-3">
        <p className="text-[11px] leading-snug text-slate-400">
          Summarizes uploaded documents only. Not medical advice — verify against the
          cited source.
        </p>
      </div>
    </aside>
  );
}
