import axios from 'axios';

// In dev the Vite proxy rewrites /api → http://localhost:8000.
// In production set VITE_API_BASE to your Render URL.
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

export const fetchClients = () => api.get('/clients').then((r) => r.data);
export const fetchClient = (id) => api.get(`/clients/${id}`).then((r) => r.data);
export const fetchReports = () => api.get('/reports').then((r) => r.data);
export const fetchReport = (id) => api.get(`/reports/${id}`).then((r) => r.data);
export const reportPdfUrl = (id) => `${API_BASE}/reports/${id}/pdf`;

/**
 * Open an SSE stream against /generate-report/{clientId}.
 *
 * EventSource only supports GET, so we POST via fetch + ReadableStream and
 * parse the SSE protocol ourselves. Returns { cancel } to stop the stream.
 */
export function streamReportGeneration(clientId, handlers = {}) {
  const controller = new AbortController();
  const url = `${API_BASE}/generate-report/${clientId}`;

  (async () => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        throw new Error(`Stream failed: ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      // Normalize all SSE line endings (\r\n or \r) to \n so the parser
      // works whether the server uses CRLF (default in sse-starlette) or LF.
      const SEP = /\r?\n\r?\n/;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let match;
        while ((match = SEP.exec(buffer)) !== null) {
          const chunk = buffer.slice(0, match.index);
          buffer = buffer.slice(match.index + match[0].length);
          parseEvent(chunk, handlers);
        }
      }
      handlers.onClose?.();
    } catch (err) {
      if (err.name !== 'AbortError') handlers.onError?.(err);
    }
  })();

  return { cancel: () => controller.abort() };
}

function parseEvent(raw, handlers) {
  let event = 'message';
  const dataLines = [];
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine;
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (!dataLines.length) return;
  let payload;
  try {
    payload = JSON.parse(dataLines.join('\n'));
  } catch {
    payload = dataLines.join('\n');
  }
  handlers.onEvent?.(event, payload);
}
