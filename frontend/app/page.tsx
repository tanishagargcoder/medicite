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
            <div className="mx-auto max-w-lg py-10">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-clinical-50 text-clinical-600">
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 5a2 2 0 0 1 2-2h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                  <path d="M9 12h6M12 9v6" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                Ask a question about your records
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Every claim in the answer carries a citation you can click to open the
                exact page it came from. If the documents don&apos;t say, MediCite says so
                rather than guessing.
              </p>
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
                Try one
              </p>
              <div className="mt-2 space-y-2">
                {SAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => submit(q)}
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 transition hover:border-clinical-500 hover:bg-clinical-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-8">
              {turns.map((turn) => (
                <div key={turn.id}>
                  <div className="mb-3 flex justify-end">
                    <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-clinical-500 px-4 py-2 text-sm font-medium text-white shadow-sm">
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
                    <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white p-4 shadow-sm">
                      {turn.abstained && (
                        <p className="mb-2 inline-block rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                          Not enough in the documents to answer
                        </p>
                      )}
                      <AnswerText
                        text={turn.answer}
                        citations={turn.citations}
                        onCitationClick={jumpToCitation}
                      />

                      {turn.citations.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Sources
                          </p>
                          {turn.citations.map((citation) => (
                            <button
                              key={citation.chunk_id}
                              onClick={() => jumpToCitation(citation)}
                              className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:border-clinical-500 hover:bg-clinical-50"
                            >
                              <div className="flex items-baseline gap-2">
                                <span className="rounded bg-clinical-100 px-1.5 py-0.5 text-xs font-semibold text-clinical-700">
                                  {citation.marker}
                                </span>
                                <span className="truncate text-xs font-medium text-slate-700">
                                  {citation.filename}
                                </span>
                                <span className="ml-auto shrink-0 text-xs text-slate-500">
                                  p.{citation.page_number}
                                  {citation.section_title ? ` · ${citation.section_title}` : ""}
                                </span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                                {citation.snippet}
                              </p>
                            </button>
                          ))}
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
          className="border-t border-slate-200 px-6 py-4"
        >
          <div className="mx-auto flex max-w-2xl gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What was the discharge diagnosis?"
              disabled={pending}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-clinical-500 focus:outline-none focus:ring-1 focus:ring-clinical-500 disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={pending || !question.trim()}
              className="rounded-lg bg-clinical-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-clinical-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {pending ? "Asking…" : "Ask"}
            </button>
          </div>
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
