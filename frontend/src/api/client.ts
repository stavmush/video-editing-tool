import type { Session, Segment } from "./types";

const BASE = "/sessions";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export function createSession(): Promise<Session> {
  return request<Session>(BASE, { method: "POST" });
}

export function getSession(id: string): Promise<Session> {
  return request<Session>(`${BASE}/${id}`);
}

export function listSessions(): Promise<Session[]> {
  return request<Session[]>(BASE);
}

export function deleteSession(id: string): Promise<void> {
  return request<void>(`${BASE}/${id}`, { method: "DELETE" });
}

// ── Upload ────────────────────────────────────────────────────────────────────

export function uploadVideo(
  sessionId: string,
  file: File,
  onProgress?: (pct: number) => void,
  extractSubtitles = false,
): Promise<Session> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file, file.name);

    const url = `${BASE}/${sessionId}/upload${extractSubtitles ? "?extract_subtitles=true" : ""}`;
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText) as Session);
      else reject(new Error(`${xhr.status}: ${xhr.responseText}`));
    };

    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(form);
  });
}

export function uploadSrt(sessionId: string, file: File): Promise<Session> {
  const form = new FormData();
  form.append("file", file, file.name);
  return request<Session>(`${BASE}/${sessionId}/upload-srt`, { method: "POST", body: form });
}

// ── Processing ────────────────────────────────────────────────────────────────

export function transcribe(
  sessionId: string,
  modelSize: string,
): Promise<{ queued: boolean; position: number }> {
  return request(`${BASE}/${sessionId}/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model_size: modelSize }),
  });
}

export function translate(
  sessionId: string,
  sourceLang: string,
  targetLang: string,
): Promise<{ queued: boolean; position: number }> {
  return request(`${BASE}/${sessionId}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_lang: sourceLang, target_lang: targetLang }),
  });
}

export function denoise(
  sessionId: string,
): Promise<{ queued: boolean; position: number }> {
  return request(`${BASE}/${sessionId}/denoise`, { method: "POST" });
}

// ── Subtitles ─────────────────────────────────────────────────────────────────

export function getSubtitles(sessionId: string): Promise<Segment[]> {
  return request<Segment[]>(`${BASE}/${sessionId}/subtitles`);
}

export function saveSubtitles(
  sessionId: string,
  segments: Segment[],
): Promise<{ ok: boolean; count: number }> {
  return request(`${BASE}/${sessionId}/subtitles`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(segments),
  });
}

// ── Export ────────────────────────────────────────────────────────────────────

export function exportSrt(
  sessionId: string,
  rtlMarks = false,
  filename = "subtitles.srt",
): string {
  return `${BASE}/${sessionId}/export/srt?rtl_marks=${rtlMarks}&filename=${encodeURIComponent(filename)}`;
}

export function exportEmbed(
  sessionId: string,
  opts: {
    rtlMarks?: boolean;
    primaryLang?: string;
    secondSrt?: string;
    secondLang?: string;
  } = {},
): Promise<{ queued: boolean }> {
  return request(`${BASE}/${sessionId}/export/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rtl_marks: opts.rtlMarks ?? false,
      primary_lang: opts.primaryLang,
      second_srt: opts.secondSrt,
      second_lang: opts.secondLang,
    }),
  });
}

export function exportBurn(
  sessionId: string,
  opts: { rtl?: boolean; fontPath?: string; fontSize?: number } = {},
): Promise<{ queued: boolean }> {
  return request(`${BASE}/${sessionId}/export/burn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rtl: opts.rtl ?? false,
      font_path: opts.fontPath,
      font_size: opts.fontSize ?? 24,
    }),
  });
}

export function downloadExportUrl(sessionId: string): string {
  return `${BASE}/${sessionId}/export/download`;
}

export function videoUrl(sessionId: string): string {
  return `${BASE}/${sessionId}/video`;
}

// ── SSE Progress ──────────────────────────────────────────────────────────────

export function openProgressStream(
  sessionId: string,
  onEvent: (event: { type: string; value: number; message: string }) => void,
  onClose?: () => void,
): EventSource {
  const es = new EventSource(`${BASE}/${sessionId}/progress`);

  es.onmessage = (e) => {
    try {
      // The server sends Python dict repr; parse it safely
      const data = JSON.parse(e.data) as { type: string; value: number; message: string };
      onEvent(data);
      if (data.type === "done" || data.type === "error") {
        es.close();
        onClose?.();
      }
    } catch {
      // ignore malformed events
    }
  };

  es.onerror = () => {
    es.close();
    onClose?.();
  };

  return es;
}
