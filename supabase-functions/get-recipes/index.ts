// Supabase Edge Function: get-recipes
// Deploy the same way as the others: Supabase Dashboard -> Edge Functions ->
// Deploy a new function -> Via Editor -> name it exactly "get-recipes".
//
// Required secret (already added): ANTHROPIC_API_KEY

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { ingredients } = await req.json();

    if (!ingredients || !ingredients.trim()) {
      return new Response(JSON.stringify({ error: "Please list at least one ingredient." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `A client has these ingredients on hand: ${ingredients}.

Suggest exactly 3 simple, healthy recipes using mostly these ingredients (a few common pantry basics like salt, oil, or spices are fine to assume).

Respond ONLY with valid JSON, no preamble, no markdown fences, in exactly this shape:
[
  {"title": "Recipe name", "description": "One short sentence, main ingredients used"},
  {"title": "Recipe name", "description": "One short sentence, main ingredients used"},
  {"title": "Recipe name", "description": "One short sentence, main ingredients used"}
]`,
        }],
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: result }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = result.content?.[0]?.text || "[]";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const recipes = JSON.parse(cleaned);

    return new Response(JSON.stringify({ recipes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
