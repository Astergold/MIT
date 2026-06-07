import { createFileRoute } from "@tanstack/react-router";
import type { Run } from "@/types/alphaai";

export const Route = createFileRoute("/r/$workflowId/$runId")({
  head: () => ({
    meta: [{ title: "Recording · MIT-ADT AI Voice Platform" }],
  }),
  loader: async ({ params }) => {
    const { workflowId, runId } = params;

    // Rate limiting: simple in-memory map
    let ip = "unknown";
    try {
      const req = (globalThis as any).__req;
      if (req?.headers) {
        const forwarded = req.headers.get("x-forwarded-for");
        ip = forwarded ? String(forwarded).split(",")[0] : "unknown";
      }
    } catch {
      // ignore
    }

    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 20;

    // In-memory rate limit store (resets on server restart)
    const rateLimitMap = (globalThis as any).__rateLimitMap__ || new Map();
    (globalThis as any).__rateLimitMap__ = rateLimitMap;

    // Clean old entries
    for (const [key, timestamp] of rateLimitMap) {
      if (now - (timestamp as number) > windowMs) {
        rateLimitMap.delete(key);
      }
    }

    const ipKey = `rate:${ip}`;
    const currentCount = rateLimitMap.get(ipKey) || 0;
    if (currentCount >= maxRequests) {
      throw new Response("Too many requests, please try again later", {
        status: 429,
      });
    }
    rateLimitMap.set(ipKey, currentCount + 1);

    // Fetch using env vars directly (no auth required)
    const base = process.env.ALPHAAI_API_BASE_URL;
    const key = process.env.ALPHAAI_API_KEY;

    if (!base || !key) {
      throw new Response("Configuration error", { status: 500 });
    }

    const url = `${base.replace(/\/$/, "")}/workflow/${workflowId}/runs/${runId}`;
    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
        },
      });
    } catch (e) {
      throw new Response("Failed to fetch recording", { status: 503 });
    }

    if (!res.ok) {
      throw new Response("Recording not found", { status: 404 });
    }

    const run = (await res.json()) as Run;

    // Fetch transcript if available
    let transcriptText: string | undefined;
    if (run.transcript_public_url) {
      try {
        const trRes = await fetch(run.transcript_public_url);
        if (trRes.ok) {
          transcriptText = await trRes.text();
        }
      } catch {
        // transcript fetch failed, continue without
      }
    }

    return {
      run,
      transcriptText,
      customerName: (run.initial_context?.customer_name as string) ?? "Unknown",
      phone: run.called_number ?? (run.initial_context?.phone_number as string) ?? "—",
    };
  },
  component: RecordingPage,
});

function RecordingPage() {
  const data = Route.useLoaderData();
  const { run, transcriptText, customerName, phone } = data as {
    run: RouteDefinition & { recording_public_url?: string; transcript_public_url?: string };
    transcriptText?: string;
    customerName: string;
    phone: string;
  };

  // Parse transcript
  const messages: Array<{ role: string; text: string; timestamp?: string }> = [];
  if (transcriptText) {
    transcriptText.split("\n").forEach((line) => {
      const match = line.match(/^\[([^\]]+)\]\s+(assistant|user):\s+(.*)$/);
      if (match) {
        messages.push({
          role: match[2] === "assistant" ? "agent" : "user",
          text: match[3],
          timestamp: match[1],
        });
      }
    });
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-2 border-b border-[--mitadt-border] pb-4">
          <span className="font-semibold text-[--mitadt-purple-dark]">{customerName}</span>
          <span className="text-[--mitadt-text-muted]">·</span>
          <span className="font-mono text-[--mitadt-text-muted]">{phone}</span>
        </div>

        {/* Audio Player */}
        <div className="mb-6">
          {run.recording_public_url ? (
            <audio controls className="w-full" src={run.recording_public_url} />
          ) : (
            <p className="text-[--mitadt-text-muted]">Recording not available</p>
          )}
        </div>

        {/* Transcript */}
        {messages.length > 0 ? (
          <div>
            <h3 className="mb-3 font-semibold text-[--mitadt-text-primary]">Transcript</h3>
            <div className="space-y-2">
              {messages.map((msg, i) => {
                const isAgent = msg.role === "agent";
                return (
                  <div
                    key={i}
                    className={`max-w-[80%] text-xs ${
                      isAgent
                        ? "bg-[--mitadt-bg-secondary] text-[--mitadt-text-primary] ml-auto rounded-lg px-3 py-2"
                        : "bg-[--mitadt-purple] text-white mr-auto rounded-lg px-3 py-2"
                    }`}
                  >
                    <p className="mb-1">{msg.text}</p>
                    {msg.timestamp && (
                      <p className="opacity-70">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-[--mitadt-text-muted]">Transcript not available</p>
        )}
      </div>
    </div>
  );
}