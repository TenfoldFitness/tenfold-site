// Supabase Edge Function: get-workout
// Deploy the same way as the others: name it exactly "get-workout".
//
// Required secrets (already added): ANTHROPIC_API_KEY
//
// Follows a fixed weekly split (client sends which day's focus applies):
//   Monday    - Legs
//   Tuesday   - Chest & Biceps
//   Wednesday - Back & Abs
//   Thursday  - Shoulders
//   Friday    - Legs
//   Saturday  - Biceps & Triceps
//   Sunday    - Rest day (front-end skips calling this function)
//
// NEW: personalizes the workout using the client's latest assessment
// (from assessment.html), so someone with a low balance score gets more
// balance work folded in, someone with strong strength scores gets a
// harder baseline, etc.

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

function buildPersonalizationNote(a) {
  if (!a) return "No assessment on file yet, so keep this at a moderate, broadly accessible difficulty.";

  const notes = [];
  if (a.strength_score <= 4) notes.push("their strength assessment score was low, so favor easier variations and lower rep ranges to build a safe foundation");
  else if (a.strength_score >= 8) notes.push("their strength assessment score was high, so it's safe to use more challenging variations and higher intensity");

  if (a.balance_score <= 4) notes.push("their balance score was low, so include at least one balance-challenging element (e.g. single-leg or unstable positions) if appropriate for the day's focus");

  if (a.mobility_score <= 4) notes.push("their mobility score was low, so favor controlled ranges of motion and include a brief mobility-focused cue");

  if (a.aerobic_score <= 4) notes.push("their aerobic endurance score was low, so keep rest periods a bit more generous and avoid overly cardio-taxing supersets");

  if (notes.length === 0) return "Their assessment scores were solid across the board, so a standard moderate-to-challenging difficulty is appropriate.";
  return "Personalize based on their recent self-assessment: " + notes.join("; ") + ".";
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { equipment, focus, clientEmail } = await req.json();
    const allowedEquipment = ["Resistance bands", "Dumbbells", "Bodyweight"];
    if (!equipment || !allowedEquipment.includes(equipment) || !focus) {
      return new Response(JSON.stringify({ error: "Please pick a valid equipment option." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let personalizationNote = "No assessment on file yet, so keep this at a moderate, broadly accessible difficulty.";
    if (clientEmail) {
      const { data: assessments } = await supabaseAdmin
        .from("assessments")
        .select("*")
        .eq("client_email", clientEmail)
        .order("created_at", { ascending: false })
        .limit(1);
      if (assessments && assessments.length) {
        personalizationNote = buildPersonalizationNote(assessments[0]);
      }
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
          content: `Create today's workout, focused on: ${focus}, using only ${equipment}. Suitable for a generally healthy adult.

${personalizationNote}

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
