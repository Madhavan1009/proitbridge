import { useEffect, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const STARTER_QUESTIONS = [
  'What drove the biggest win this month?',
  'What would happen if we doubled email spend?',
  'Why is the worst channel underperforming?',
  'How should we reallocate the budget?',
];

function MessageBubble({ role, content, streaming }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-brand text-white rounded-br-sm'
            : 'bg-slate-100 text-slate-800 rounded-bl-sm'
        }`}
      >
        {content}
        {streaming && <span className="inline-block w-1.5 h-3.5 bg-current align-middle ml-0.5 animate-pulse" />}
      </div>
    </div>
  );
}

export default function ChatPanel({ reportId, clientName }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const controllerRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (text) => {
    const userMsg = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages([...history, { role: 'assistant', content: '', streaming: true }]);
    setInput('');
    setStreaming(true);
    setError(null);

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({
          report_id: reportId,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        throw new Error(`Chat failed: ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantText = '';
      const SEP = /\r?\n\r?\n/;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let match;
        while ((match = SEP.exec(buffer)) !== null) {
          const chunk = buffer.slice(0, match.index);
          buffer = buffer.slice(match.index + match[0].length);
          let eventName = 'message';
          const dataLines = [];
          for (const line of chunk.split(/\r?\n/)) {
            if (line.startsWith('event:')) eventName = line.slice(6).trim();
            else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
          }
          if (!dataLines.length) continue;
          let payload;
          try { payload = JSON.parse(dataLines.join('\n')); } catch { continue; }

          if (eventName === 'chat_delta') {
            assistantText += payload.delta;
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = { role: 'assistant', content: assistantText, streaming: true };
              return next;
            });
          } else if (eventName === 'chat_done') {
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = { role: 'assistant', content: assistantText, streaming: false };
              return next;
            });
          } else if (eventName === 'chat_error') {
            throw new Error(payload.error || 'chat failed');
          }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        setError(e.message);
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setStreaming(false);
      controllerRef.current = null;
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;
    send(text);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900">Chat with this report</h3>
        <p className="text-xs text-slate-500">
          Ask follow-up questions about {clientName}'s performance — the assistant has the full report and metrics as context.
        </p>
      </div>

      <div ref={scrollRef} className="px-6 py-4 space-y-3 max-h-[420px] min-h-[180px] overflow-y-auto">
        {messages.length === 0 ? (
          <div>
            <p className="text-xs text-slate-400 mb-2">Try one of these:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => !streaming && send(q)}
                  className="text-left text-sm bg-slate-50 hover:bg-brand/5 hover:border-brand/30 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} content={m.content} streaming={m.streaming} />
          ))
        )}
        {error && (
          <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="px-6 py-4 border-t border-slate-200 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={streaming}
          placeholder="Ask about channels, recommendations, projections…"
          className="flex-1 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/40"
        />
        <button
          type="submit"
          disabled={!input.trim() || streaming}
          className="bg-brand hover:bg-brand-dark disabled:bg-slate-300 text-white text-sm font-semibold px-4 py-2 rounded-md transition"
        >
          {streaming ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
