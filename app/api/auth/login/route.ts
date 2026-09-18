import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail) {
      return Response.json(
        { error: "Enter your email address." },
        { status: 400 }
      );
    }

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

    const origin = new URL(request.url).origin;

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/`,
        shouldCreateUser: false,
      },
    });

    if (error) {
  console.error("ApplyFast returning sign-in error:", error);

  return Response.json(
    {
      error: error.message,
    },
    { status: 400 }
  );
}
    return Response.json({
      success: true,
      message: "Check your email for the newest ApplyFast sign-in link.",
    });
  } catch (error) {
    console.error("ApplyFast returning sign-in route error:", error);

    return Response.json(
      { error: "Could not send the sign-in email." },
      { status: 500 }
    );
  }
}
