import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { email, token } = await request.json();

    if (
      !email ||
      typeof email !== "string" ||
      !token ||
      typeof token !== "string"
    ) {
      return Response.json(
        { error: "Email and 6-digit code are required." },
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

    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: "email",
    });

    if (error || !data.session) {
      console.error("ApplyFast OTP verify error:", error);

      return Response.json(
        { error: "That code is invalid or expired. Please try again." },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error("ApplyFast OTP verify route error:", error);

    return Response.json(
      { error: "Could not verify the login code." },
      { status: 500 }
    );
  }
}
