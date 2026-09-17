import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type UnlockRequest = {
  generationId?: string;
  sessionId?: string;
};

export async function POST(request: Request) {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SECRET_KEY ||
      !process.env.STRIPE_SECRET_KEY
    ) {
      return Response.json(
        { error: "Server is not configured." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as UnlockRequest;

    const generationId =
      typeof body.generationId === "string"
        ? body.generationId.trim()
        : "";

    const sessionId =
      typeof body.sessionId === "string"
        ? body.sessionId.trim()
        : "";

    if (!generationId || !sessionId) {
      return Response.json(
        { error: "Missing payment information." },
        { status: 400 }
      );
    }

    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(
        sessionId
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        },
        cache: "no-store",
      }
    );

    const session = await stripeResponse.json();

    if (!stripeResponse.ok) {
      console.error("Stripe session lookup error:", session);

      return Response.json(
        { error: "Could not verify payment." },
        { status: 400 }
      );
    }

    if (session.payment_status !== "paid") {
      return Response.json(
        {
          error: "PAYMENT_NOT_COMPLETE",
          message: "Payment is not complete yet.",
        },
        { status: 409 }
      );
    }

    if (session.metadata?.generation_id !== generationId) {
      return Response.json(
        { error: "Payment does not match this CV." },
        { status: 403 }
      );
    }

    const email = String(
      session.metadata?.email ||
        session.customer_details?.email ||
        session.customer_email ||
        ""
    )
      .trim()
      .toLowerCase();

    if (!email) {
      return Response.json(
        { error: "Payment email is missing." },
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

    const { data: generationBefore, error: generationBeforeError } =
      await supabase
        .from("generations")
        .select("id, status, stripe_session_id")
        .eq("id", generationId)
        .maybeSingle();

    if (generationBeforeError) {
      console.error(
        "ApplyFast generation lookup error:",
        generationBeforeError
      );

      return Response.json(
        { error: "Could not load your CV." },
        { status: 500 }
      );
    }

    if (!generationBefore) {
      return Response.json(
        { error: "CV generation not found." },
        { status: 404 }
      );
    }

    if (
      generationBefore.stripe_session_id &&
      generationBefore.stripe_session_id !== sessionId
    ) {
      return Response.json(
        { error: "Payment session mismatch." },
        { status: 403 }
      );
    }

    /*
      Usually the Stripe webhook completes this first.
      This block is a safe fallback in case the customer returns
      before Stripe's webhook has finished.
    */
    if (generationBefore.status !== "unlocked") {
      let userId = "";

      const { data: existingProfile, error: profileLookupError } =
        await supabase
          .from("profiles")
          .select("id")
          .ilike("email", email)
          .maybeSingle();

      if (profileLookupError) {
        console.error(
          "ApplyFast profile lookup error:",
          profileLookupError
        );

        return Response.json(
          { error: "Could not load your ApplyFast account." },
          { status: 500 }
        );
      }

      if (existingProfile?.id) {
        userId = existingProfile.id;
      } else {
        const { data: createdUser, error: createUserError } =
          await supabase.auth.admin.createUser({
            email,
            email_confirm: true,
          });

        if (createUserError || !createdUser.user?.id) {
          /*
            If the webhook created the user at almost the same time,
            re-check the profile before failing.
          */
          const { data: retryProfile } = await supabase
            .from("profiles")
            .select("id")
            .ilike("email", email)
            .maybeSingle();

          if (!retryProfile?.id) {
            console.error(
              "ApplyFast account creation error:",
              createUserError
            );

            return Response.json(
              { error: "Could not create your ApplyFast account." },
              { status: 500 }
            );
          }

          userId = retryProfile.id;
        } else {
          userId = createdUser.user.id;
        }
      }

      const credits = Number(session.metadata?.credits || 10);

      const { error: purchaseError } = await supabase.rpc(
        "complete_applyfast_purchase",
        {
          p_user_id: userId,
          p_email: email,
          p_generation_id: generationId,
          p_stripe_session_id: sessionId,
          p_purchase_credits:
            Number.isInteger(credits) && credits > 0 ? credits : 10,
        }
      );

      if (purchaseError) {
        console.error(
          "ApplyFast purchase completion error:",
          purchaseError
        );

        return Response.json(
          { error: "Payment succeeded, but unlock is still processing." },
          { status: 409 }
        );
      }
    }

    const { data: generation, error: generationError } = await supabase
      .from("generations")
      .select("result, status, user_id, email, stripe_session_id")
      .eq("id", generationId)
      .single();

    if (generationError || !generation) {
      console.error("ApplyFast unlocked CV error:", generationError);

      return Response.json(
        { error: "Could not load your unlocked CV." },
        { status: 500 }
      );
    }

    if (
      generation.status !== "unlocked" ||
      generation.stripe_session_id !== sessionId
    ) {
      return Response.json(
        {
          error: "PAYMENT_PROCESSING",
          message: "Your payment is confirmed. Unlock is still processing.",
        },
        { status: 409 }
      );
    }

    let creditsRemaining: number | null = null;

    if (generation.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", generation.user_id)
        .maybeSingle();

      if (typeof profile?.credits === "number") {
        creditsRemaining = profile.credits;
      }
    }

    const result =
      generation.result &&
      typeof generation.result === "object"
        ? generation.result
        : {};

    return Response.json({
      ...result,
      locked: false,
      generationId,
      creditsRemaining,
      accountEmail: generation.email || email,
    });
  } catch (error) {
    console.error("ApplyFast unlock error:", error);

    return Response.json(
      { error: "Could not unlock your CV. Please try again." },
      { status: 500 }
    );
  }
}
