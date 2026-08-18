// Supabase Edge Function: get-workout
// Deploy the same way as the others: name it exactly "get-workout".
//
// Required secret (already added): ANTHROPIC_API_KEY
//
// Follows a fixed weekly split (client sends which day's focus applies):
//   Monday    - Legs
//   Tuesday   - Chest & Biceps
//   Wednesday - Back & Abs
//   Thursday  - Shoulders
//   Friday    - Legs
//   Saturday  - Biceps & Triceps
//   Sunday    - Rest day (front-end skips calling this function)

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
    const { equipment, focus } = await req.json();
    const allowedEquipment = ["Resistance bands", "Dumbbells", "Bodyweight"];
    if (!equipment || !allowedEquipment.includes(equipment) || !focus) {
      return new Response(JSON.stringify({ error: "Please pick a valid equipment option." }), {
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
        max_tokens: 700,
        messages: [{
          role: "user",
          content: `Create today's workout, focused on: ${focus}, using only ${equipment}. Suitable for a generally healthy adult, moderate difficulty.

Structure it as exactly 3 supersets, each with exactly 2 exercises (6 exercises total). Each superset is performed for 3 sets.

Respond ONLY with valid JSON, no preamble, no markdown fences, in exactly this shape:
{
  "focus": "${focus}",
  "supersets": [
    {"exercises": [
      {"name": "Exercise name", "reps": "10-12", "note": "Short form/cue tip"},
      {"name": "Exercise name", "reps": "10-12", "note": "Short form/cue tip"}
    ]},
    {"exercises": [ ... ]},
    {"exercises": [ ... ]}
  ]
}`,
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
    const workout = JSON.parse(cleaned);

    return new Response(JSON.stringify({ workout }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

