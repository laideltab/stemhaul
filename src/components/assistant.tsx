"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, MessageCircleQuestion, RotateCcw, Send, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { buildAssistantData } from "@/lib/assistant/scope";
import { cn } from "@/lib/format";

type Msg = { role: "user" | "assistant"; text: string; error?: boolean };

const SUGGESTIONS: Record<string, string[]> = {
  wholesaler: ["Which AWBs are in the air right now?", "What happened with PO-1044?", "¿Qué clientes nos deben dinero?", "Is any box missing or damaged?"],
  farm: ["Did my last shipment arrive in Miami?", "¿Cuál es el house AWB de mi última orden?", "How much does ITS still owe me?", "Do I have map orders to confirm?"],
  florist: ["¿Dónde están mis cajas de hoy?", "What flight is my last order on?", "Which invoices do I have open?", "How many red roses do I have in stock?"],
};
const TOOL_LABEL: Record<string, string> = {
  find: "Searching", list_shipments: "Checking shipments", shipment_detail: "Opening the AWB", order_detail: "Opening the order",
  list_orders: "Checking orders", list_boxes: "Checking boxes", box_history: "Tracing the box", money: "Checking invoices", flight_status: "Checking the flight", stock: "Checking stock",
};

export function Assistant() {
  const session = useStore((s) => s.session);
  if (!session || session.orgId === "platform") return null;
  // Keyed by account, so switching accounts starts a new conversation.
  return <AssistantPanel key={`${session.orgId}:${session.userId}`} orgId={session.orgId} userId={session.userId} />;
}

function AssistantPanel({ orgId, userId }: { orgId: string; userId: string }) {
  const orgs = useStore((s) => s.orgs);
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Scroll only the chat list, never the page behind it.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const org = orgs.find((o) => o.id === orgId);
  const kind = org?.kind ?? "florist";
  const staticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === "1";

  async function ask(q: string) {
    const question = q.trim().slice(0, 1000);
    if (!question || busy) return;
    const history: Msg[] = [...msgs.filter((m) => !m.error), { role: "user", text: question }];
    setMsgs([...history, { role: "assistant", text: "" }]);
    setInput("");
    setBusy("Thinking");
    const append = (t: string, error = false) =>
      setMsgs((m) => {
        const last = m[m.length - 1];
        return [...m.slice(0, -1), { ...last, text: last.text + t, error: error || last.error }];
      });
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      if (staticDemo) throw new Error("The assistant runs on the live site, stemhaul.vercel.app. This offline copy can't reach it.");
      const s = useStore.getState();
      const data = buildAssistantData(s, orgId, userId);
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, messages: history.map(({ role, text }) => ({ role, text })) }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.message ?? "The assistant is not available right now.");
      }
      // Streamed text arrives in many tiny pieces; render it at most once per frame.
      let pending = "";
      let frame = 0;
      const push = (t: string) => {
        pending += t;
        if (!frame) frame = requestAnimationFrame(() => { frame = 0; const t2 = pending; pending = ""; append(t2); });
      };
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line) continue;
          const ev = JSON.parse(line) as { t: string; v?: string };
          if (ev.t === "text") { setBusy(null); push(ev.v ?? ""); }
          else if (ev.t === "tool") setBusy(TOOL_LABEL[ev.v ?? ""] ?? "Looking it up");
          else if (ev.t === "break") push("\n\n");
          else if (ev.t === "error") push(ev.v ?? "Something went wrong.");
        }
      }
      if (frame) cancelAnimationFrame(frame);
      if (pending) append(pending);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      append(e instanceof Error ? e.message : "Something went wrong.", true);
    } finally {
      if (abortRef.current === ctrl) setBusy(null);
    }
  }

  return (
    <div className="no-print">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ask Lux"
          className="fixed bottom-4 right-4 z-40 flex size-12 items-center justify-center gap-2 rounded-full bg-brand text-sm font-medium text-brand-fg shadow-lg hover:bg-brand/90 sm:bottom-5 sm:right-5 sm:size-auto sm:px-4 sm:py-3"
        >
          <MessageCircleQuestion size={20} /> <span className="hidden sm:inline">Ask Lux</span>
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-surface sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(640px,calc(100vh-40px))] sm:w-[400px] sm:rounded-2xl sm:border sm:border-line sm:shadow-2xl">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <MessageCircleQuestion size={18} className="text-brand" />
            <div className="min-w-0 flex-1">
              <div className="font-display font-semibold leading-tight">Lux</div>
              <div className="truncate text-xs text-muted">Answers from {org?.shortName ?? org?.name}&apos;s data only</div>
            </div>
            {msgs.length > 0 && (
              <button onClick={() => { abortRef.current?.abort(); setMsgs([]); setBusy(null); }} className="rounded-lg p-1.5 text-muted hover:bg-surface-2" aria-label="New conversation" title="New conversation">
                <RotateCcw size={16} />
              </button>
            )}
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 text-sm">
            {msgs.length === 0 && (
              <div>
                <p className="text-muted">Ask about your shipments, AWBs, flights, boxes, orders or invoices, in English or Spanish.</p>
                <div className="mt-3 flex flex-col items-start gap-2">
                  {(SUGGESTIONS[kind] ?? SUGGESTIONS.florist).map((q) => (
                    <button key={q} onClick={() => ask(q)} className="rounded-full border border-line px-3 py-1.5 text-left hover:bg-surface-2">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-brand px-3 py-2 text-brand-fg">
                  {m.text}
                </div>
              ) : m.text ? (
                <div key={i} className={cn("mr-4 rounded-2xl rounded-bl-sm bg-surface-2 px-3 py-2", m.error && "bg-bad-soft text-bad")}>
                  <Rich text={m.text} onNavigate={() => { if (window.innerWidth < 640) setOpen(false); }} />
                </div>
              ) : null,
            )}
            {busy && (
              <div className="flex items-center gap-2 text-muted">
                <Loader2 size={14} className="animate-spin" /> {busy}…
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); ask(input); }}
            className="flex items-end gap-2 border-t border-line p-3"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
              rows={1}
              maxLength={1000}
              placeholder="Where is my cargo? ¿Qué pasó con esta carga?"
              className="max-h-32 min-h-9 flex-1 resize-none rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <button type="submit" disabled={!input.trim() || !!busy} className="flex size-9 items-center justify-center rounded-lg bg-brand text-brand-fg disabled:opacity-50" aria-label="Send">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// Minimal markdown: paragraphs, "- " bullets, **bold**, *italic* and [label](/in-app/path) links. Only in-app links become links.
function Rich({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  const inline = (s: string, k: string): ReactNode[] =>
    s.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)\s]+\))/g).map((part, i) => {
      const bold = part.match(/^\*\*([^*]+)\*\*$/);
      if (bold) return <strong key={k + i}>{bold[1]}</strong>;
      const em = part.match(/^\*([^*]+)\*$/);
      if (em) return <em key={k + i}>{em[1]}</em>;
      const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (link) {
        return link[2].startsWith("/") && !link[2].startsWith("//") ? (
          <Link key={k + i} href={link[2]} onClick={onNavigate} className="font-medium text-brand underline underline-offset-2">{link[1]}</Link>
        ) : (
          <Fragment key={k + i}>{link[1]}</Fragment>
        );
      }
      return <Fragment key={k + i}>{part}</Fragment>;
    });
  // Group consecutive bullet lines into a list; everything else is a paragraph per blank-line block.
  const out: ReactNode[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flush = () => {
    const k = out.length;
    if (para.length)
      out.push(<p key={k}>{para.map((l, li) => <Fragment key={li}>{li > 0 && <br />}{inline(l.replace(/^#+\s*/, ""), `${k}.${li}.`)}</Fragment>)}</p>);
    else if (list.length)
      out.push(<ul key={k} className="list-disc space-y-0.5 pl-4">{list.map((l, li) => <li key={li}>{inline(l, `${k}.${li}.`)}</li>)}</ul>);
    para = [];
    list = [];
  };
  for (const line of text.trim().split("\n")) {
    const bullet = line.match(/^\s*(?:[-*•]|\d+\.) (.*)$/);
    if (!line.trim()) flush();
    else if (bullet) { if (para.length) flush(); list.push(bullet[1]); }
    else { if (list.length) flush(); para.push(line); }
  }
  flush();
  return <div className="space-y-2">{out}</div>;
}
