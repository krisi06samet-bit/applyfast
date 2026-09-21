import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

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

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("ApplyFast logout error:", error);

      return Response.json(
        { error: "Could not sign out." },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("ApplyFast logout route error:", error);

    return Response.json(
      { error: "Could not sign out." },
      { status: 500 }
    );
  }
}
