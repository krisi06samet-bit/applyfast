import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const response = NextResponse.json(
    { success: true },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase environment variables are missing." },
        { status: 500 }
      );
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(
              ({ name, value, options }) => {
                response.cookies.set(name, value, options);
              }
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.signOut({
      scope: "local",
    });

    if (error) {
      console.error("Supabase logout error:", error.message);
    }

    // Допълнителна защита: премахва останали Supabase cookies.
    for (const cookie of request.cookies.getAll()) {
      const name = cookie.name.toLowerCase();

      if (
        name.startsWith("sb-") ||
        name.includes("supabase")
      ) {
        response.cookies.set(cookie.name, "", {
          path: "/",
          expires: new Date(0),
          maxAge: 0,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
        });
      }
    }

    return response;
  } catch (error) {
    console.error("Logout route failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Logout failed.",
      },
      { status: 500 }
    );
  }
}
