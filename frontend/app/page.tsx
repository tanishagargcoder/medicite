"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import AnswerText from "@/components/AnswerText";
import DocumentSidebar from "@/components/DocumentSidebar";
import {
  ask,
  deleteDocument,
  documentFileUrl,
  listDocuments,
  uploadDocument,
  type Citation,
  type DocumentSummary,
} from "@/lib/api";

// react-pdf touches the DOM directly, so it can't be server-rendered.
const PdfViewer = dynamic(() => import("@/components/PdfViewer"), { ssr: false });

interface Turn {
  id: string;
  question: string;
  answer: string | null;
  citations: Citation[];
  abstained: boolean;
  error: string | null;
}

const SAMPLE_QUESTIONS = [
  "What medications was the patient discharged on, and at what doses?",
  "Summarize the assessment and plan.",
  "Were any abnormal lab values documented?",
  "What follow-up was recommended?",
];

export default function Home() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeDoc, setActiveDoc] = useState<DocumentSummary | null>(null);
  const [targetPage, setTargetPage] = useState<number | null>(null);
  const [jumpNonce, setJumpNonce] = useState(0);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listDocuments().then(setDocuments).catch(() => setBanner("Could not reach the API. Is the backend running on :8000?"));
  }, []);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setBanner(null);
    try {
      const doc = await uploadDocument(file);
      setDocuments((prev) => [doc, ...prev]);
      setActiveDoc(doc);
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (activeDoc?.id === id) setActiveDoc(null);
    } catch {
      setBanner("Could not delete that document.");
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /** Clicking a citation opens its document and scrolls to the exact page. */
  const jumpToCitation = (citation: Citation) => {
    const doc = documents.find((d) => d.id === citation.document_id);
    if (doc && doc.id !== activeDoc?.id) setActiveDoc(doc);
    setTargetPage(citation.page_number);
    setJumpNonce((n) => n + 1);
  };

  const submit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    if (documents.length === 0) {
      setBanner("Upload a document first — answers come only from your uploads.");
      return;
    }

    const turnId = crypto.randomUUID();
    setTurns((prev) => [
      ...prev,
      { id: turnId, question: trimmed, answer: null, citations: [], abstained: false, error: null },
    ]);
    setQuestion("");
    setPending(true);

    try {
      const result = await ask(trimmed, selectedIds.size ? [...selectedIds] : null);
      setTurns((prev) =>
        prev.map((t) =>
          t.id === turnId
            ? { ...t, answer: result.answer, citations: result.citations, abstained: result.abstained }
            : t,
        ),
      );
    } catch (err) {
      setTurns((prev) =>
        prev.map((t) =>
          t.id === turnId
            ? { ...t, error: err instanceof Error ? err.message : "Something went wrong." }
            : t,
        ),
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="flex h-screen overflow-hidden">
      <DocumentSidebar
        documents={documents}
        activeId={activeDoc?.id ?? null}
        selectedIds={selectedIds}
        uploading={uploading}
        onUpload={handleUpload}
        onOpen={(doc) => {
          setActiveDoc(doc);
          setTargetPage(null);
        }}
        onToggleSelected={toggleSelected}
        onDelete={handleDelete}
      />

      {/* Chat */}
      <section className="flex min-w-0 flex-1 flex-col border-r border-slate-200 bg-white">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Conversation</h2>
            <p className="text-xs text-slate-500">
              {documents.length === 0
                ? "Upload a record to begin"
                : selectedIds.size > 0
                  ? `Scoped to ${selectedIds.size} document${selectedIds.size === 1 ? "" : "s"}`
                  : `Searching all ${documents.length} document${documents.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-clinical-50 px-2.5 py-1 text-xs font-medium text-clinical-700">
            <span className="h-1.5 w-1.5 rounded-full bg-clinical-500" />
            Grounded &amp; cited
          </span>
        </header>

        {banner && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            {banner}
            <button
              onClick={() => setBanner(null)}
              className="ml-2 text-amber-600 underline hover:text-amber-800"
            >
              dismiss
            </button>
          </div>
        )}

        <div ref={transcriptRef} className="flex-1 overflow-y-auto px-6 py-6">
          {turns.length === 0 ? (
            <div className="mx-auto max-w-xl animate-fade-up py-12">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-clinical-600 to-clinical-400 text-white shadow-float">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 5a2 2 0 0 1 2-2h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                  <path d="M9 12h6M12 9v6" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Ask a question about your records
              </h2>
              <p className="mt-2.5 text-[15px] leading-relaxed text-slate-600">
                Every claim carries a citation you can click to open the exact source
                page. If the documents don&apos;t say, MediCite says so — it never guesses.
              </p>
              <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Try one
              </p>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {SAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => submit(q)}
                    className="group flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3 text-left text-sm text-slate-700 shadow-card transition hover:-translate-y-0.5 hover:border-clinical-400 hover:shadow-float"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-clinical-50 text-clinical-600 transition group-hover:bg-clinical-500 group-hover:text-white">
                      <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                    <span className="leading-snug">{q}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-8">
              {turns.map((turn) => (
                <div key={turn.id} className="animate-fade-up">
                  <div className="mb-3 flex justify-end">
                    <p className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-clinical-600 to-clinical-500 px-4 py-2.5 text-sm font-medium text-white shadow-float">
                      {turn.question}
                    </p>
                  </div>

                  {turn.error ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {turn.error}
                    </p>
                  ) : turn.answer === null ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-clinical-500 [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-clinical-500 [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-clinical-500" />
                      </span>
                      Retrieving passages and composing a grounded answer…
                    </div>
                  ) : (
                    <div className="rounded-2xl rounded-tl-md border border-slate-200/80 bg-white p-4 shadow-card">
                      {turn.abstained && (
                        <p className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                          </svg>
                          Not enough in the documents to answer
                        </p>
                      )}
                      <AnswerText
                        text={turn.answer}
                        citations={turn.citations}
                        onCitationClick={jumpToCitation}
                      />

                      {turn.citations.length > 0 && (
                        <div className="mt-4 border-t border-slate-100 pt-3.5">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Sources
                          </p>
                          <div className="space-y-2">
                            {turn.citations.map((citation) => (
                              <button
                                key={citation.chunk_id}
                                onClick={() => jumpToCitation(citation)}
                                className="group block w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:border-clinical-400 hover:bg-white hover:shadow-card"
                              >
                                <div className="flex items-baseline gap-2">
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-clinical-500 text-[11px] font-bold text-white">
                                    {citation.marker}
                                  </span>
                                  <span className="truncate text-xs font-semibold text-slate-700">
                                    {citation.filename}
                                  </span>
                                  <span className="ml-auto shrink-0 text-xs font-medium text-clinical-600">
                                    p.{citation.page_number}
                                    {citation.section_title ? ` · ${citation.section_title}` : ""}
                                  </span>
                                </div>
                                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                                  {citation.snippet}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(question);
          }}
          className="border-t border-slate-200 bg-white px-6 py-4"
        >
          <div className="mx-auto flex max-w-2xl items-center gap-1.5 rounded-full border border-slate-300 bg-white py-1.5 pl-4 pr-1.5 shadow-sm transition focus-within:border-clinical-500 focus-within:ring-2 focus-within:ring-clinical-500/20">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about a diagnosis, medication, lab value…"
              disabled={pending}
              className="flex-1 bg-transparent py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={pending || !question.trim()}
              aria-label="Ask"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clinical-500 text-white transition hover:bg-clinical-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {pending ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 11l5-5 5 5M12 6v13" />
                </svg>
              )}
            </button>
          </div>
          <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-slate-400">
            Answers come only from your uploaded documents. Verify against the cited source.
          </p>
        </form>
      </section>

      {/* Viewer */}
      <section className="hidden w-[43%] min-w-0 shrink-0 lg:block">
        <PdfViewer
          fileUrl={activeDoc ? documentFileUrl(activeDoc.id) : null}
          filename={activeDoc?.filename ?? null}
          targetPage={targetPage}
          jumpNonce={jumpNonce}
        />
      </section>
    </main>
  );
}
