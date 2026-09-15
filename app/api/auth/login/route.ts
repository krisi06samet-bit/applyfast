import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
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
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      console.error("ApplyFast login error:", error);

      return Response.json(
        { error: "Could not send the login email. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: "Check your email for the login link.",
    });
  } catch (error) {
    console.error("ApplyFast login route error:", error);

    return Response.json(
      { error: "Could not send the login email." },
      { status: 500 }
    );
  }
}
