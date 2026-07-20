export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export interface DocumentSummary {
  id: string;
  filename: string;
  page_count: number;
  chunk_count: number;
  uploaded_at: string;
  status: "processing" | "ready" | "failed";
  error: string | null;
}

export interface Citation {
  marker: number;
  chunk_id: string;
  document_id: string;
  filename: string;
  page_number: number;
  section_title: string | null;
  snippet: string;
  retrieval_score: number;
  rerank_score: number | null;
}

export interface AskResponse {
  answer: string;
  citations: Citation[];
  cited_markers: number[];
  abstained: boolean;
  mode: "grounded" | "general";
  usage: Record<string, number>;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.detail ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  return handle(await fetch(`${API_BASE}/api/documents`, { cache: "no-store" }));
}

export async function uploadDocument(file: File): Promise<DocumentSummary> {
  const body = new FormData();
  body.append("file", file);
  return handle(await fetch(`${API_BASE}/api/documents`, { method: "POST", body }));
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/documents/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Delete failed (${res.status})`);
}

export async function ask(
  question: string,
  documentIds: string[] | null,
): Promise<AskResponse> {
  return handle(
    await fetch(`${API_BASE}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, document_ids: documentIds }),
    }),
  );
}

export function documentFileUrl(id: string): string {
  return `${API_BASE}/api/documents/${id}/file`;
}
