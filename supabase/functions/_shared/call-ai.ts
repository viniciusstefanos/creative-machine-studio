/** Call Claude (Anthropic) for text generation */
export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  opts?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: opts?.maxTokens ?? 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      temperature: opts?.temperature ?? 0.7,
    }),
  });
  if (!res.ok) {
    const status = res.status;
    const errText = await res.text();
    console.error("Claude error:", status, errText);
    throw new Error(status === 429 ? "rate_limit" : status === 402 ? "credits" : "ai_failed");
  }
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

/** Call Lovable AI Gateway (OpenAI-compatible) for text generation */
export async function callLovableAI(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  opts?: { model?: string; temperature?: number },
): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts?.model ?? "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: opts?.temperature,
    }),
  });
  if (!res.ok) {
    const status = res.status;
    const errText = await res.text();
    console.error("Lovable AI error:", status, errText);
    throw new Error(status === 429 ? "rate_limit" : status === 402 ? "credits" : "ai_failed");
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

/** Unified text AI call — picks Claude or Lovable AI based on flags */
export async function callTextAI(
  systemPrompt: string,
  userPrompt: string,
  useClaude: boolean,
  anthropicKey: string,
  lovableKey: string,
  opts?: { maxTokens?: number; temperature?: number; model?: string },
): Promise<string> {
  if (useClaude && anthropicKey) {
    return callClaude(systemPrompt, userPrompt, anthropicKey, opts);
  }
  return callLovableAI(systemPrompt, userPrompt, lovableKey, opts);
}
