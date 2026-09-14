import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { ensureCustomerFromUser } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = searchParams.get("next") || "/account";
  const safeNext = nextPath.startsWith("/") ? nextPath : "/account";

  if (code) {
    try {
      const supabase = await createServerSupabase();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.user) {
        try {
          await ensureCustomerFromUser(data.user);
        } catch {
          // Email is confirmed even if the customer-row write hits a
          // transient DB error (ECONNRESET/pooler drop). The next
          // authenticated request self-heals via getSession.
        }
        return NextResponse.redirect(`${origin}${safeNext}`);
      }
    } catch {
      // Fall through to the error redirect below — never crash the overlay.
    }
  }

  return NextResponse.redirect(`${origin}/account?auth_error=1`);
}
