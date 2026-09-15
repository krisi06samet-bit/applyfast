import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json(
        { error: "Stripe is not configured." },
        { status: 500 }
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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json(
        { error: "LOGIN_REQUIRED" },
        { status: 401 }
      );
    }

    const origin = new URL(request.url).origin;

    const body = new URLSearchParams();

    body.set("mode", "payment");
    body.set("success_url", `${origin}/?payment=success`);
    body.set("cancel_url", `${origin}/?payment=cancel`);

    body.set("line_items[0][quantity]", "1");
    body.set("line_items[0][price_data][currency]", "eur");
    body.set("line_items[0][price_data][unit_amount]", "699");

    body.set(
      "line_items[0][price_data][product_data][name]",
      "ApplyFast — 10 application credits"
    );

    body.set(
      "line_items[0][price_data][product_data][description]",
      "10 CV application credits"
    );

    body.set("metadata[user_id]", user.id);
    body.set("metadata[credits]", "10");

    if (user.email) {
      body.set("customer_email", user.email);
    }

    const stripeResponse = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    );

    const session = await stripeResponse.json();

    if (!stripeResponse.ok || !session.url) {
      console.error("Stripe checkout error:", session);

      return Response.json(
        { error: "Could not start checkout." },
        { status: 500 }
      );
    }

    return Response.json({
      url: session.url,
    });
  } catch (error) {
    console.error("ApplyFast checkout error:", error);

    return Response.json(
      { error: "Could not start checkout." },
      { status: 500 }
    );
  }
}
