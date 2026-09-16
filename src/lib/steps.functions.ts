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
            content: [
              "Du bist ein vorausschauender Begleiter für einen Menschen mit Demenz.",
              "Aus dem Satz der Person machst du eine Liste kleiner, konkreter Schritte auf Deutsch.",
              "Denke aktiv voraus und ergänze, was die Person selbst nicht sagt:",
              "- Termine: Erinnerung und Wecker am Vortag und am Tag selbst, rechtzeitig aufstehen, Versichertenkarte und Terminzettel einpacken, Weg und Uhrzeit klären, wer mitkommt.",
              "- Kochen und Backen: erst prüfen, ob alle Zutaten da sind (Zutaten einzeln nennen), fehlende Sachen einkaufen, Geld und Tasche mitnehmen, Ofen vorheizen.",
              "- Ausgehen: Wetter anschauen, passende Jacke, Schlüssel, Portemonnaie, Handy.",
              "- Am Ende: aufräumen, Herd und Licht ausschalten.",
              "Regeln: ein Schritt = eine einzige Handlung, Du-Form ('Schau nach, ob ...'), höchstens 14 Wörter pro Schritt, keine Nummerierung, keine Fachwörter, 6 bis 18 Schritte.",
              "Wecker und Uhrzeiten nennst du konkret, zum Beispiel 'Stell einen Wecker auf 7:00 Uhr'.",
              "Wichtig: Bei jedem Schritt, wo etwas fehlen oder schiefgehen kann (Zutaten, Material, Kleidung, Zeit), setze eine kurze Ja/Nein-Frage in 'ask' (z. B. 'Ist alles da?') und in 'subSteps' die Unterschritte, die dann nötig sind (z. B. Zettel schreiben, Jacke anziehen, Geld mitnehmen, einkaufen gehen, zurückkommen).",
              "Bei Schritten ohne solche Unsicherheit lass 'ask' auf null und 'subSteps' leer.",
              "Der letzte Schritt endet mit 'Fertig!'. Antworte nur als JSON.",
            ].join("\n"),
          },
          {
            role: "user",
            content: `Heute ist ${new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" })}.\nDie Person sagt: ${data.wish}`,
          },
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
                steps: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["text", "ask", "subSteps"],
                    properties: {
                      text: { type: "string" },
                      ask: { type: ["string", "null"] },
                      subSteps: { type: "array", items: { type: "string" } },
                    },
                  },
                },
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
      .object({
        title: z.string().min(1),
        steps: z
          .array(
            z.object({
              text: z.string().min(1),
              ask: z.string().nullable().optional(),
              subSteps: z.array(z.string().min(1)).nullable().optional(),
            }),
          )
          .min(1),
      })
      .parse(JSON.parse(content));

    return {
      id: `eigene-${Date.now()}`,
      title: parsed.title,
      steps: parsed.steps.map((s) => {
        const subs = (s.subSteps ?? []).filter((x) => x.trim().length > 0);
        return subs.length > 0 && s.ask
          ? { text: s.text, ask: s.ask, ifNo: subs }
          : { text: s.text };
      }),
    };
  });

