export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

const TOKEN_KEY = "medicite_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

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

/** Thrown on a 401 so the app can drop the session and show the login screen. */
export class UnauthorizedError extends Error {}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    setToken(null);
    throw new UnauthorizedError("Your session has expired. Please sign in again.");
  }
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.detail ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// ---- Auth ----

export async function register(email: string, name: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name, password }),
  });
  const data = await handle<AuthResponse>(res);
  setToken(data.token);
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await handle<AuthResponse>(res);
  setToken(data.token);
  return data;
}

export async function getMe(): Promise<User> {
  return handle(await fetch(`${API_BASE}/api/auth/me`, { headers: authHeaders(), cache: "no-store" }));
}

export function logout(): void {
  setToken(null);
}

// ---- Documents & chat (all authenticated) ----

export async function listDocuments(): Promise<DocumentSummary[]> {
  return handle(await fetch(`${API_BASE}/api/documents`, { headers: authHeaders(), cache: "no-store" }));
}

export async function uploadDocument(file: File): Promise<DocumentSummary> {
  const body = new FormData();
  body.append("file", file);
  return handle(
    await fetch(`${API_BASE}/api/documents`, { method: "POST", headers: authHeaders(), body }),
  );
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/documents/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (res.status === 401) {
    setToken(null);
    throw new UnauthorizedError("Session expired.");
  }
  if (!res.ok) throw new Error(`Delete failed (${res.status})`);
}

export async function ask(
  question: string,
  documentIds: string[] | null,
): Promise<AskResponse> {
  return handle(
    await fetch(`${API_BASE}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ question, document_ids: documentIds }),
    }),
  );
}

export type StreamEvent =
  | { type: "meta"; mode: "grounded" | "general"; citations: Citation[] }
  | { type: "delta"; text: string }
  | { type: "done"; answer: string; cited_markers: number[]; abstained: boolean }
  | { type: "error"; message: string };

/** Stream an answer, invoking `onEvent` as each server event arrives.
 *
 *  Uses fetch + a stream reader rather than EventSource, because EventSource
 *  cannot send the Authorization header this endpoint requires.
 */
export async function askStream(
  question: string,
  documentIds: string[] | null,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/ask/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ question, document_ids: documentIds }),
  });

  if (res.status === 401) {
    setToken(null);
    throw new UnauthorizedError("Your session has expired. Please sign in again.");
  }
  if (!res.ok || !res.body) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.detail ?? `Request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line; keep any partial tail buffered.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      try {
        onEvent(JSON.parse(line.slice(6)) as StreamEvent);
      } catch {
        // Ignore a malformed frame rather than killing the whole stream.
      }
    }
  }
}

/** react-pdf `file` source — the /file endpoint is authenticated, so the token
 *  rides along as a request header rather than in the URL. */
export function documentFileSource(id: string): { url: string; httpHeaders: Record<string, string> } {
  return { url: `${API_BASE}/api/documents/${id}/file`, httpHeaders: authHeaders() };
}
