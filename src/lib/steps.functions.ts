import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  wish: z.string().trim().min(2).max(120),
});

export const buildSteps = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("KEIN_SCHLUESSEL");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          {
            role: "system",
            content:
              "Du hilfst einem Menschen mit Demenz. Zerlege die genannte Aufgabe in sehr kleine, einfache Schritte auf Deutsch. Regeln: ein Schritt = eine einzige Handlung, Höflichkeitsform ('Nehmen Sie ...'), maximal 12 Wörter pro Schritt, keine Nummerierung, keine Fachwörter, 5 bis 16 Schritte. Denke auch an vorbereitende Schritte (Sachen holen, einkaufen) und beende den letzten Schritt mit 'Fertig!'. Antworte nur als JSON.",
          },
          { role: "user", content: `Aufgabe: ${data.wish}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "aufgabe",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["title", "steps"],
              properties: {
                title: { type: "string" },
                steps: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 402 || res.status === 403) throw new Error("KEIN_GUTHABEN");
      if (res.status === 429) throw new Error("ZU_VIELE_ANFRAGEN");
      throw new Error(`AI_FEHLER: ${res.status} ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    const parsed = z
      .object({ title: z.string().min(1), steps: z.array(z.string().min(1)).min(1) })
      .parse(JSON.parse(content));

    return {
      id: `eigene-${Date.now()}`,
      title: parsed.title,
      steps: parsed.steps,
    };
  });
