import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Supabase is not configured." },
        { status: 500 }
      );
    }

    const response = NextResponse.json(
      { success: true },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.signOut({
      scope: "local",
    });

    if (error) {
      console.error("Supabase logout error:", error);
    }

    // Force-delete every Supabase auth cookie
    request.cookies.getAll().forEach((cookie) => {
      const name = cookie.name.toLowerCase();

      if (
        name.startsWith("sb-") ||
        name.includes("supabase")
      ) {
        response.cookies.set(cookie.name, "", {
          path: "/",
          expires: new Date(0),
          maxAge: 0,
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }
    });

    return response;
  } catch (error) {
    console.error("ApplyFast logout route error:", error);

    return NextResponse.json(
      { error: "Could not sign out." },
      { status: 500 }
    );
  }
}
