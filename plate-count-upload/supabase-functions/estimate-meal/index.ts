// Supabase Edge Function: estimate-meal
// Used by Plate Count ("Describe it" and "Photo of label or meal").
// Deploy the same way as the others: name it exactly "estimate-meal".
// Required secret (already added): ANTHROPIC_API_KEY
// Keep "Verify JWT" ON so only signed-in clients can call it.

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const SCHEMA =
  'Return ONLY a JSON object: {"items":[{"name":string,"amount":string,"kcal":number,' +
  '"protein_g":number,"carbs_g":number,"fat_g":number}],"note":string}. ' +
  '"amount" is the portion in plain words, e.g. "1 cup" or "6 oz". ' +
  "Numbers are for the WHOLE portion described, not per 100 g. " +
  "Split a meal into separate items when the components are clearly distinct. " +
  'If you cannot tell, make the most reasonable estimate and say so in "note". ' +
  'Keep "note" under 20 words, or empty if nothing is worth flagging.';

serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { text, image, mediaType } = await req.json();
    if (!text && !image) return json({ error: "Send a description or a photo." }, 400);
    if (text && String(text).length > 1000) return json({ error: "Description is too long." }, 400);
    if (image && String(image).length > 6_000_000) return json({ error: "Photo is too large." }, 400);

    const content: unknown[] = [];
    if (image) {
      content.push({ type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: image } });
      content.push({
        type: "text",
        text:
          "This photo is either a nutrition facts panel on a package, or a plated meal.\n" +
          'If it is a LABEL: read the panel exactly, use the printed serving size as the amount, give numbers for ONE serving, and put the product name in "name".\n' +
          "If it is a MEAL: identify the components and estimate portions.\n\n" + SCHEMA,
      });
    } else {
      content.push({ type: "text", text: `Estimate nutrition for this meal: "${text}"\n\n${SCHEMA}` });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        messages: [{ role: "user", content }],
      }),
    });
    const result = await response.json();
    if (!response.ok) return json({ error: "Estimate service error." }, 502);

    const raw = result.content?.[0]?.text || "{}";
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return json({ items: parsed.items || [], note: parsed.note || "" });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
