import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_ANON_KEY ||
      !process.env.SUPABASE_SECRET_KEY
    ) {
      return Response.json(
        { authenticated: false },
        { status: 200 }
      );
    }

    const cookieStore = await cookies();

    const authSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return Response.json({
        authenticated: false,
      });
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: profile, error } = await adminSupabase
      .from("profiles")
      .select("credits, email")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("ApplyFast account balance error:", error);

      return Response.json(
        { error: "Could not load account." },
        { status: 500 }
      );
    }

    return Response.json({
      authenticated: true,
      email:
        typeof profile?.email === "string"
          ? profile.email
          : user.email || "",
      credits:
        typeof profile?.credits === "number"
          ? profile.credits
          : 0,
    });
  } catch (error) {
    console.error("ApplyFast account route error:", error);

    return Response.json(
      { error: "Could not load account." },
      { status: 500 }
    );
  }
}
