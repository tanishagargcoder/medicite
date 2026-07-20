"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Serve the worker from the installed package rather than a CDN.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface Props {
  fileUrl: string | null;
  filename: string | null;
  /** Page a citation asked us to jump to. Bumping `jumpNonce` re-triggers the
   *  scroll even when the same page is clicked twice in a row. */
  targetPage: number | null;
  jumpNonce: number;
}

export default function PdfViewer({ fileUrl, filename, targetPage, jumpNonce }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [flashPage, setFlashPage] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Scroll the cited page into view and flash it.
  useEffect(() => {
    if (!targetPage) return;
    const node = pageRefs.current.get(targetPage);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
    setFlashPage(targetPage);
    const timer = setTimeout(() => setFlashPage(null), 1500);
    return () => clearTimeout(timer);
  }, [targetPage, jumpNonce, numPages]);

  if (!fileUrl) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="max-w-xs">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-clinical-500 shadow-card ring-1 ring-slate-200">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3v4a1 1 0 0 0 1 1h4" />
              <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
              <path d="M9 13h6M9 17h4" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700">Source viewer</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            Select a document on the left, or click a citation in an answer to jump
            straight to its source page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
        <p className="truncate text-sm font-medium text-slate-700" title={filename ?? ""}>
          {filename}
        </p>
        {numPages > 0 && (
          <span className="ml-3 shrink-0 text-xs text-slate-500">
            {numPages} page{numPages === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto bg-slate-100 p-4">
        {error ? (
          <div className="mx-auto max-w-sm rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {error}
          </div>
        ) : (
          <Document
            file={fileUrl}
            onLoadSuccess={({ numPages }) => {
              setNumPages(numPages);
              setError(null);
            }}
            onLoadError={(e) =>
              setError(
                `Could not render this file (${e.message}). DOCX uploads have no visual preview — the citation still names the page.`,
              )
            }
            loading={<p className="py-12 text-center text-sm text-slate-500">Loading document…</p>}
          >
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
              <div
                key={pageNumber}
                ref={(node) => {
                  if (node) pageRefs.current.set(pageNumber, node);
                  else pageRefs.current.delete(pageNumber);
                }}
                className={`mb-4 ${flashPage === pageNumber ? "citation-target" : ""}`}
              >
                <div className="mb-1 text-center text-xs text-slate-400">Page {pageNumber}</div>
                <Page
                  pageNumber={pageNumber}
                  width={640}
                  renderAnnotationLayer
                  renderTextLayer
                />
              </div>
            ))}
          </Document>
        )}
      </div>
    </div>
  );
}
