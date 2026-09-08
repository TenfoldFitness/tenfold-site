// Supabase Edge Function: get-restaurant-macros
// Deploy the same way: name it exactly "get-restaurant-macros".
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
    const { restaurantName, mealDescription } = await req.json();

    if (!restaurantName || !mealDescription) {
      return new Response(JSON.stringify({ error: "Please enter a restaurant and a meal." }), {
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
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `Give a reasonable estimate of the nutrition facts for this restaurant meal:
Restaurant: ${restaurantName}
Meal: ${mealDescription}

Respond ONLY with valid JSON, no preamble, no markdown fences, in exactly this shape:
{"calories": 000, "protein_g": 00, "carbs_g": 00, "fat_g": 00}

These are estimates, not verified nutrition facts, so use your best reasonable judgment.`,
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

    const text = result.content?.[0]?.text || "{}";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const macros = JSON.parse(cleaned);

    return new Response(JSON.stringify({ macros }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
