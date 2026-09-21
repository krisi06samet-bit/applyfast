import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type CheckoutRequest = {
  email?: string;
  generationId?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SECRET_KEY
    ) {
      return Response.json(
        { error: "Supabase is not configured." },
        { status: 500 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";

    if (!stripeSecretKey) {
      return Response.json(
        { error: "Stripe is not configured." },
        { status: 500 }
      );
    }

    if (stripeSecretKey.startsWith("sk_test_")) {
      console.error("ApplyFast production checkout is using a Stripe TEST key.");

      return Response.json(
        {
          error:
            "Stripe is still using Test mode on this deployment. Open the main ApplyFast website and try again.",
        },
        { status: 500 }
      );
    }

    if (!stripeSecretKey.startsWith("sk_live_")) {
      console.error("ApplyFast Stripe key is not a live secret key.");

      return Response.json(
        { error: "Stripe live payments are not configured correctly." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as CheckoutRequest;

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const generationId =
      typeof body.generationId === "string"
        ? body.generationId.trim()
        : "";

    if (!email || !isValidEmail(email)) {
      return Response.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (!generationId) {
      return Response.json(
        { error: "Missing generation ID." },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: generation, error: generationError } = await supabase
      .from("generations")
      .select("id, status, stripe_session_id")
      .eq("id", generationId)
      .maybeSingle();

    if (generationError) {
      console.error("ApplyFast generation lookup error:", generationError);

      return Response.json(
        { error: "Could not load your CV preview." },
        { status: 500 }
      );
    }

    if (!generation) {
      return Response.json(
        { error: "This CV preview no longer exists." },
        { status: 404 }
      );
    }

    if (generation.status === "unlocked") {
      return Response.json(
        { error: "This CV has already been unlocked." },
        { status: 409 }
      );
    }

    const { error: emailSaveError } = await supabase
      .from("generations")
      .update({ email })
      .eq("id", generationId)
      .eq("status", "locked");

    if (emailSaveError) {
      console.error("ApplyFast email save error:", emailSaveError);

      return Response.json(
        { error: "Could not save your email." },
        { status: 500 }
      );
    }

    const origin = "https://applyfast-six.vercel.app";

    const stripeBody = new URLSearchParams();

    stripeBody.set("mode", "payment");
    stripeBody.set(
      "success_url",
      `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}&generation_id=${encodeURIComponent(
        generationId
      )}`
    );
    stripeBody.set(
      "cancel_url",
      `${origin}/?payment=cancel&generation_id=${encodeURIComponent(
        generationId
      )}`
    );

    stripeBody.set("customer_email", email);

    stripeBody.set("line_items[0][quantity]", "1");
    stripeBody.set("line_items[0][price_data][currency]", "eur");
    stripeBody.set("line_items[0][price_data][unit_amount]", "699");
    stripeBody.set(
      "line_items[0][price_data][product_data][name]",
      "ApplyFast — 10 application credits"
    );
    stripeBody.set(
      "line_items[0][price_data][product_data][description]",
      "Unlock your CV and get 10 ApplyFast application credits"
    );

    stripeBody.set("metadata[email]", email);
    stripeBody.set("metadata[generation_id]", generationId);
    stripeBody.set("metadata[credits]", "10");

    const stripeResponse = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: stripeBody.toString(),
      }
    );

    const session = await stripeResponse.json();

    if (!stripeResponse.ok || !session?.url || !session?.id) {
      console.error("Stripe checkout error:", session);

      return Response.json(
        { error: "Could not start checkout. Please try again." },
        { status: 500 }
      );
    }

    const { error: sessionSaveError } = await supabase
      .from("generations")
      .update({ stripe_session_id: session.id })
      .eq("id", generationId)
      .eq("status", "locked");

    if (sessionSaveError) {
      console.error(
        "ApplyFast Stripe session save error:",
        sessionSaveError
      );

      return Response.json(
        { error: "Could not prepare checkout. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("ApplyFast checkout error:", error);

    return Response.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 }
    );
  }
}
