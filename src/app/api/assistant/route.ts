import Anthropic from "@anthropic-ai/sdk";
import type { AssistantData } from "@/lib/assistant/scope";
import { runTool, TOOLS } from "@/lib/assistant/tools";

export const maxDuration = 60;

const MODEL = "claude-opus-5-5";
const MAX_ROUNDS = 6;
const MAX_QUESTION = 1000;
const MAX_HISTORY = 12;
const MAX_BODY = 600_000;

// Best-effort limit per visitor so the public demo can't run up the bill. Resets when the server restarts.
const HOURLY_LIMIT = 40;
const hits = new Map<string, number[]>();
function allowed(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  if (recent.length >= HOURLY_LIMIT) return false;
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

const SYSTEM = `You are "Ask Stem Haul", the assistant inside Stem Haul, software for flower importers (wholesalers), the farms that ship to them and the florists that buy from them.
You answer questions about shipments, master and house AWBs, flights, boxes, orders (purchase orders, map orders, prebooks), invoices, bills, payments and florist stock.

How to work:
- Always look the facts up with your tools before answering. Never invent numbers, dates, AWBs or amounts. If the tools don't show it, say you can't find it for this account.
- The tools only return what the signed-in account is allowed to see. If the user asks about another company's data (another customer, another importer, prices they don't see on their screens), say that information isn't available to their account. Do not guess.
- Answer in the user's language (Spanish or English), short and direct: lead with the answer in one or two sentences, then a few bullets only if they help.
- When a record has a "link", add it as a markdown link so the user can open that screen, e.g. [PO-1044](/w/purchase-orders/po_1044). Only use links the tools returned.
- Glossary: master AWB = the airline's air waybill for the whole load; house AWB (HAWB) = the cargo agency's sub-waybill for one importer's part of it; FB/HB/QB/EB = full, half, quarter, eighth box; "mark" = the customer code printed on the box.
- Box statuses: labeled = label printed at the farm, not flown; in_transit = on a closed AWB, flying or in customs; received = scanned in at the Miami warehouse; delivered = delivered to the customer; missing / damaged = flagged at Miami receiving.
- For "where are my boxes / my cargo" questions, check the boxes themselves (list_boxes), not only the orders: boxes can already be flown, in the warehouse or delivered.
- Flight status in this demo is simulated; say so briefly when you give it.`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "no_key", message: "The assistant is not set up yet: the ANTHROPIC_API_KEY is missing on the server." }, { status: 503 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowed(ip)) return Response.json({ error: "rate", message: "Too many questions for now. Try again in a while." }, { status: 429 });

  const raw = await req.text();
  if (raw.length > MAX_BODY) return Response.json({ error: "too_big", message: "Request too large." }, { status: 413 });
  let body: { data: AssistantData; messages: { role: "user" | "assistant"; text: string }[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "bad_request", message: "Bad request." }, { status: 400 });
  }
  const data = body.data;
  const history = (body.messages ?? []).filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.text === "string" && m.text.trim()).slice(-MAX_HISTORY);
  if (!data?.viewer || history.at(-1)?.role !== "user") return Response.json({ error: "bad_request", message: "Bad request." }, { status: 400 });
  while (history[0]?.role === "assistant") history.shift();

  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((m) => ({ role: m.role, content: m.text.slice(0, MAX_QUESTION * 4) }));
  const v = data.viewer;
  // Who is asking goes after the cache breakpoint, so the fixed instructions and tools stay cached for every account.
  const viewer = `Signed-in account: ${v.org} (${v.kind}). User: ${v.user}, role ${v.role}. Today is ${v.today}.`;

  const client = new Anthropic();
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: object) => controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      try {
        for (let round = 0; round < MAX_ROUNDS; round++) {
          const s = client.beta.messages.stream({
            model: MODEL,
            max_tokens: 4000,
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            output_config: { effort: "low" },
            system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }, { type: "text", text: viewer }],
            tools: TOOLS,
            messages,
          });
          s.on("text", (t) => send({ t: "text", v: t }));
          const msg = await s.finalMessage();
          if (msg.stop_reason === "refusal") {
            send({ t: "text", v: "\n\nI can't help with that one." });
            break;
          }
          if (msg.stop_reason !== "tool_use") break;
          messages.push({ role: "assistant", content: msg.content });
          const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
          for (const b of msg.content) {
            if (b.type !== "tool_use") continue;
            send({ t: "tool", v: b.name });
            let out: unknown;
            try {
              out = runTool(data, b.name, (b.input ?? {}) as Record<string, unknown>);
            } catch (e) {
              out = { error: String(e) };
            }
            results.push({ type: "tool_result", tool_use_id: b.id, content: JSON.stringify(out) });
          }
          messages.push({ role: "user", content: results });
          send({ t: "break" });
        }
      } catch (e) {
        const msg =
          e instanceof Anthropic.RateLimitError ? "The assistant is busy, try again in a minute."
          : e instanceof Anthropic.AuthenticationError ? "The assistant's API key is not valid."
          : e instanceof Anthropic.APIError ? `The assistant had a problem (${e.status ?? "network"}).`
          : "The assistant had a problem.";
        console.error("assistant error", e);
        send({ t: "error", v: msg });
      }
      send({ t: "done" });
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
