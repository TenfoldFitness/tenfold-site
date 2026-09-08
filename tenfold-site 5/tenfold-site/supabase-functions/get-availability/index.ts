// Supabase Edge Function: get-availability
// Deploy the same way as the others: name it exactly "get-availability".
//
// Returns which time slots are already booked on a given date, WITHOUT
// exposing which client booked them. This lets the booking calendar show
// real open slots while keeping other clients' info private.

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { date } = await req.json(); // "YYYY-MM-DD"
    if (!date) {
      return new Response(JSON.stringify({ error: "Missing date." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const startOfDay = new Date(date + "T00:00:00");
    const endOfDay = new Date(date + "T23:59:59");

    const { data, error } = await supabaseAdmin
      .from("appointments")
      .select("appointment_time, duration_minutes")
      .eq("status", "upcoming")
      .gte("appointment_time", startOfDay.toISOString())
      .lte("appointment_time", endOfDay.toISOString());

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const busyPeriods = data.map(row => ({
      start: row.appointment_time,
      durationMinutes: row.duration_minutes || 45,
    }));

    return new Response(JSON.stringify({ busyPeriods }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
