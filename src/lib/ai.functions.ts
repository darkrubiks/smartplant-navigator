import { supabase } from "@/integrations/supabase/client";
import { AssistantInput, validateAssistantResponse } from "./assistant-contract";

export async function chatWithAssistant({ data: raw }: { data: unknown }) {
  const data = AssistantInput.parse(raw);
  const endpoint = import.meta.env.VITE_AI_ENDPOINT;
  if (!endpoint) {
    throw new Error(
      "The AI assistant service is not configured yet. Please use building search or the directory.",
    );
  }
  const url = new URL(endpoint);
  if (
    url.protocol !== "https:" &&
    !(import.meta.env.DEV && ["localhost", "127.0.0.1"].includes(url.hostname))
  ) {
    throw new Error("The assistant service requires HTTPS.");
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 429) throw new Error("AI usage limit reached. Try again shortly.");
  if (!response.ok)
    throw new Error("The assistant service is unavailable. Please try again shortly.");
  return validateAssistantResponse(await response.json(), data.context.buildings);
}
