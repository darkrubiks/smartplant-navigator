import { useEffect, useRef, useState } from "react";
import { Bot, Send, X, Sparkles } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import type { BuildingRow } from "@/lib/types";
import { getBuildingName, getDepartmentName } from "@/lib/buildings";
import { chatWithAssistant } from "@/lib/ai.functions";

interface Message {
  role: "user" | "assistant";
  content: string;
  action?: { type: "navigate"; buildingId: string; buildingLabel?: string };
}

export function AiAssistant({
  buildings,
  currentDestinationId,
  currentOriginLabel,
}: {
  buildings: BuildingRow[];
  currentDestinationId?: string;
  currentOriginLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I’m your copilot at the São Bernardo plant. Tell me where you need to go—for example, “I have an engine delivery,” “I need the medical center,” or “Where is Building 45?”",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const resp = await chatWithAssistant({
        data: {
          history: next.slice(-8).map((m) => ({ role: m.role, content: m.content })),
          context: {
            origin: currentOriginLabel ?? "Main Gate (P1)",
            destinationId: currentDestinationId ?? null,
            buildings: buildings.map((b) => ({
              id: b.id,
              number: b.number,
              name: getBuildingName(b),
              category: b.category,
              department: getDepartmentName(b.department),
              keywords: b.keywords ?? [],
            })),
          },
        },
      });
      const reply: Message = { role: "assistant", content: resp.reply };
      if (resp.navigateToBuildingId) {
        const b = buildings.find((x) => x.id === resp.navigateToBuildingId);
        if (b) {
          reply.action = {
            type: "navigate",
            buildingId: b.id,
            buildingLabel: `${b.number} — ${getBuildingName(b)}`,
          };
        }
      }
      setMessages((m) => [...m, reply]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "I couldn’t respond right now.";
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-[700] flex items-center gap-2 rounded-full bg-[var(--mb-blue)] px-4 py-3 text-white shadow-[var(--shadow-elegant)] hover:bg-[var(--mb-blue-dark)] transition"
          aria-label="Open AI assistant"
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-semibold">AI Assistant</span>
        </button>
      )}
      {open && (
        <div className="fixed bottom-4 right-4 z-[700] flex h-[min(560px,80vh)] w-[min(400px,92vw)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-elegant)]">
          <div className="flex items-center justify-between border-b border-border bg-[var(--mb-graphite)] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <div className="text-sm font-semibold">SmartPlant Copilot</div>
                <div className="text-[10px] uppercase tracking-widest opacity-70">
                  Plant destination assistant
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="opacity-80 hover:opacity-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 bg-background/50">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-[var(--mb-blue)] text-white"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
                {m.action && (
                  <button
                    onClick={() =>
                      router.navigate({
                        to: "/nav/$destId",
                        params: { destId: m.action!.buildingId },
                      })
                    }
                    className="mt-2 inline-flex items-center rounded-lg bg-white/15 px-3 py-1 text-xs font-medium hover:bg-white/25"
                  >
                    Start route → {m.action.buildingLabel}
                  </button>
                )}
              </div>
            ))}
            {loading && (
              <div className="max-w-[70%] rounded-2xl bg-secondary px-3 py-2 text-sm text-muted-foreground">
                Thinking…
              </div>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 border-t border-border bg-card p-3"
          >
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-[var(--mb-blue)]"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="grid h-9 w-9 place-items-center rounded-full bg-[var(--mb-blue)] text-white disabled:opacity-50 hover:bg-[var(--mb-blue-dark)]"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
