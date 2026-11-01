"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { Icon } from "@/components/ui/Icon";
import { api, ClientApiError } from "@/lib/api-client";
import type { ChatReply, ChatResult } from "@/server/services/chat";

type Turn = { role: "user" | "assistant"; content: string; results?: ChatResult[]; suggestions?: string[] };

const STORE = "gtp_chat";
const MAX_CHARS = 800;

// The conversation lives only in this browser tab (sessionStorage); the
// server keeps nothing. Storage can be unavailable (private mode), so every
// access is guarded and the chat still works without it.
const load = (): Turn[] => {
  try { return JSON.parse(sessionStorage.getItem(STORE) ?? "[]") as Turn[]; } catch { return []; }
};
const save = (turns: Turn[]) => {
  try { sessionStorage.setItem(STORE, JSON.stringify(turns.slice(-20))); } catch { /* not available */ }
};

/** "Ask GetTradePros": a floating assistant that finds pros from the directory. */
export function ChatWidget() {
  const { t } = usePrefs();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const lastTurn = useRef<HTMLDivElement>(null);

  useEffect(() => setTurns(load()), []);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  // While waiting, keep the bottom in view; when a reply arrives, show it from
  // its first line so the reply text and the top results are both visible.
  useEffect(() => {
    if (!busy && turns[turns.length - 1]?.role === "assistant") lastTurn.current?.scrollIntoView({ block: "start" });
    else end.current?.scrollIntoView({ block: "end" });
  }, [turns, busy, open]);

  const send = async (message: string) => {
    const content = message.trim().slice(0, MAX_CHARS);
    if (!content || busy) return;
    const next: Turn[] = [...turns, { role: "user", content }];
    setTurns(next);
    save(next);
    setText("");
    setError("");
    setBusy(true);
    try {
      const res = await api<ChatReply>("/api/chat", {
        method: "POST",
        json: { messages: next.slice(-20).map(({ role, content: c }) => ({ role, content: c.slice(0, MAX_CHARS) })) },
      });
      const done: Turn[] = [...next, { role: "assistant", content: res.reply, results: res.results, suggestions: res.suggestions }];
      setTurns(done);
      save(done);
    } catch (err) {
      setError(err instanceof ClientApiError && err.status === 429 ? err.message : t("chat.error"));
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  };

  const restart = () => { setTurns([]); save([]); setError(""); input.current?.focus(); };
  const last = turns[turns.length - 1];

  return (
    <>
      {!open && (
        <button type="button" onClick={() => setOpen(true)}
          className="fixed bottom-4 end-4 z-[60] flex items-center gap-2 rounded-full bg-[#0B2545] px-4 py-3 text-sm font-semibold text-white shadow-xl hover:bg-[#13335c] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#C87D55]/50">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /><path d="M8.5 11h.01M12 11h.01M15.5 11h.01" />
          </svg>
          {t("chat.open")}
        </button>
      )}
      {open && (
        <section role="dialog" aria-modal="false" aria-labelledby="chat-title"
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
          className="fixed inset-x-0 bottom-0 z-[60] flex h-[85vh] flex-col overflow-hidden rounded-t-2xl border border-ink-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-4 sm:end-4 sm:h-[min(640px,85vh)] sm:w-[400px] sm:rounded-2xl">
          <header className="flex items-center justify-between gap-2 bg-[#0B2545] px-4 py-3 text-white">
            <div>
              <h2 id="chat-title" className="text-sm font-semibold">{t("chat.title")}</h2>
              <p className="text-[11px] text-white/70">{t("chat.subtitle")}</p>
            </div>
            <div className="flex items-center gap-1">
              {turns.length > 0 && <button type="button" onClick={restart} className="rounded px-2 py-1 text-xs text-white/80 hover:bg-white/10">{t("chat.restart")}</button>}
              <button type="button" onClick={() => setOpen(false)} aria-label={t("chat.close")} className="rounded p-1.5 hover:bg-white/10">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-ink-50 p-4" aria-live="polite">
            <Bubble role="assistant">{t("chat.greeting")}</Bubble>
            {turns.length === 0 && (
              <Chips items={[t("chat.example1"), t("chat.example2"), t("chat.example3")]} onPick={send} disabled={busy} />
            )}
            {turns.map((turn, i) => (
              <div key={i} ref={i === turns.length - 1 ? lastTurn : undefined} className="scroll-mt-2 space-y-2">
                <Bubble role={turn.role}>{turn.content}</Bubble>
                {turn.results && turn.results.length > 0 && (
                  <ul className="space-y-2">{turn.results.map((r) => <ResultCard key={r.id} r={r} />)}</ul>
                )}
              </div>
            ))}
            {!busy && last?.role === "assistant" && last.suggestions && last.suggestions.length > 0 && (
              <Chips items={last.suggestions} onPick={send} disabled={busy} />
            )}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-ink-500" role="status">
                <span className="flex gap-1" aria-hidden="true">
                  {[0, 150, 300].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-500" style={{ animationDelay: `${d}ms` }} />)}
                </span>
                {t("chat.thinking")}
              </div>
            )}
            {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
            <div ref={end} />
          </div>

          <form onSubmit={(e: FormEvent) => { e.preventDefault(); void send(text); }} className="border-t border-ink-200 bg-white p-3">
            <div className="flex items-end gap-2">
              <label htmlFor="chat-input" className="sr-only">{t("chat.placeholder")}</label>
              <textarea id="chat-input" ref={input} rows={1} maxLength={MAX_CHARS} value={text} placeholder={t("chat.placeholder")}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(text); } }}
                className="input max-h-28 min-h-[42px] flex-1 resize-none py-2.5 text-sm" />
              <button className="btn-primary h-[42px] px-4" disabled={busy || !text.trim()} aria-label={t("chat.send")}>
                <svg viewBox="0 0 24 24" className="h-5 w-5 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </div>
            <p className="mt-2 text-[10px] leading-snug text-ink-500">
              {t("chat.disclaimer")} <Link href="/privacy" className="underline">{t("chat.privacy")}</Link>
            </p>
          </form>
        </section>
      )}
    </>
  );
}

function Bubble({ role, children }: { role: Turn["role"]; children: string }) {
  return (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}>
      <p className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${role === "user" ? "rounded-ee-sm bg-[#0B2545] text-white" : "rounded-es-sm bg-white text-ink-900 shadow-sm ring-1 ring-ink-200"}`}>
        {children}
      </p>
    </div>
  );
}

function Chips({ items, onPick, disabled }: { items: string[]; onPick: (s: string) => void; disabled: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((s) => (
        <button key={s} type="button" disabled={disabled} onClick={() => onPick(s)}
          className="rounded-full border border-[#C87D55]/50 bg-white px-3 py-1 text-xs font-medium text-[#0B2545] hover:bg-[#C87D55]/10">
          {s}
        </button>
      ))}
    </div>
  );
}

function ResultCard({ r }: { r: ChatResult }) {
  const { t } = usePrefs();
  return (
    <li className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-ink-200">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-100 text-ink-700">
          <Icon name={r.categoryIcon ?? "wrench"} className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-900">{r.businessName}</p>
          <p className="truncate text-xs text-ink-500">{[r.categoryName, r.city].filter(Boolean).join(" · ")}</p>
          <p className="text-xs text-ink-500">
            {r.ratingCount > 0 ? <>★ {r.ratingAvg.toFixed(1)} · {t("chat.reviews", { count: r.ratingCount })}</> : t("chat.noReviews")}
          </p>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <Link href={`/traders/${r.slug}`} className="btn-ghost flex-1 py-1.5 text-xs">{t("chat.view")}</Link>
        <Link href={`/traders/${r.slug}/quote`} className="btn-primary flex-1 py-1.5 text-xs">{t("chat.quote")}</Link>
      </div>
    </li>
  );
}
