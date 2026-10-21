// Supabase Edge Function: get-post
// Deploy with JWT verification off, because visitors who are logged out must be
// able to call it (the function checks the login itself):
//   supabase functions deploy get-post --no-verify-jwt
//
// Returns one post. Members (active, unexpired membership) and the admin get
// the full content. Everyone else gets only the preview, so the paid text
// never reaches a non-member's browser.
//
// Needs the SQL in notes/posts-members-only.sql so that browsers cannot read
// posts.content directly.

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ADMIN_EMAIL = "tenfoldfunctional@gmail.com";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function isMember(req) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;

  // A publishable/anon key is not a user session; getUser simply fails for it.
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  const email = data?.user?.email;
  if (error || !email) return false;
  if (email === ADMIN_EMAIL) return true;

  const { data: memberships } = await supabaseAdmin
    .from("memberships")
    .select("expires_at")
    .eq("client_email", email)
    .eq("status", "active");

  return (memberships || []).some(
    (m) => !m.expires_at || new Date(m.expires_at) > new Date()
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { id } = await req.json();
    if (!id) return json({ error: "Missing post id." }, 400);

    const { data: post, error } = await supabaseAdmin
      .from("posts")
      .select("id, title, tag, created_at, preview, content")
      .eq("id", id)
      .single();

    if (error || !post) return json({ error: "Post not found." }, 404);

    if (await isMember(req)) {
      return json({
        post: { id: post.id, title: post.title, tag: post.tag, created_at: post.created_at, html: post.content, locked: false },
      });
    }

    return json({
      post: { id: post.id, title: post.title, tag: post.tag, created_at: post.created_at, html: post.preview, locked: true },
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
});
