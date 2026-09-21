import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_ANON_KEY
    ) {
      return Response.json(
        { error: "Supabase is not configured." },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(
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

    // Ask Supabase to invalidate the current browser session.
    await supabase.auth.signOut();

    // Extra safety: expire any Supabase auth cookies that may remain.
    for (const cookie of cookieStore.getAll()) {
      if (
        cookie.name.startsWith("sb-") ||
        cookie.name.toLowerCase().includes("supabase")
      ) {
        cookieStore.set(cookie.name, "", {
          path: "/",
          expires: new Date(0),
          maxAge: 0,
        });
      }
    }

    return Response.json(
      { success: true },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("ApplyFast logout route error:", error);

    return Response.json(
      { error: "Could not sign out." },
      { status: 500 }
    );
  }
}
