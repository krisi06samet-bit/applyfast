import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    const normalizedEmail =
      typeof email === "string"
        ? email.trim().toLowerCase()
        : "";

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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const origin = new URL(request.url).origin;

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        shouldCreateUser: false,
      },
    });

    if (error) {
      console.error("ApplyFast returning sign-in error:", error);

      return Response.json(
        {
          error:
            "We could not send a sign-in email for this account. Make sure you use the same email you paid with.",
        },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      message: "Check your email for the ApplyFast sign-in link.",
    });
  } catch (error) {
    console.error("ApplyFast returning sign-in route error:", error);

    return Response.json(
      { error: "Could not send the sign-in email." },
      { status: 500 }
    );
  }
}
