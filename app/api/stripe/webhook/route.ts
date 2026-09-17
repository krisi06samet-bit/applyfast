import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string
) {
  const parts = signatureHeader.split(",");
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signatureParts = parts.filter((part) => part.startsWith("v1="));

  if (!timestampPart || signatureParts.length === 0) return false;

  const timestamp = timestampPart.slice(2);

  const expectedSignature = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  const validSignature = signatureParts.some((part) => {
    const receivedSignature = part.slice(3);
    const receivedBuffer = Buffer.from(receivedSignature, "utf8");

    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(receivedBuffer, expectedBuffer);
  });

  if (!validSignature) return false;

  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber)) return false;

  const ageInSeconds = Math.abs(
    Math.floor(Date.now() / 1000) - timestampNumber
  );

  return ageInSeconds <= 300;
}

export async function POST(request: Request) {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SECRET_KEY ||
      !process.env.STRIPE_WEBHOOK_SECRET
    ) {
      console.error("Stripe webhook environment variables are missing.");

      return Response.json(
        { error: "Webhook is not configured." },
        { status: 500 }
      );
    }

    const rawBody = await request.text();
    const signatureHeader = request.headers.get("stripe-signature");

    if (!signatureHeader) {
      return Response.json(
        { error: "Missing Stripe signature." },
        { status: 400 }
      );
    }

    const isValidSignature = verifyStripeSignature(
      rawBody,
      signatureHeader,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (!isValidSignature) {
      console.error("Invalid Stripe webhook signature.");

      return Response.json(
        { error: "Invalid signature." },
        { status: 400 }
      );
    }

    const event = JSON.parse(rawBody);

    if (event.type !== "checkout.session.completed") {
      return Response.json({ received: true });
    }

    const session = event.data?.object;

    if (!session) {
      return Response.json(
        { error: "Missing checkout session." },
        { status: 400 }
      );
    }

    if (session.payment_status !== "paid") {
      return Response.json({
        received: true,
        ignored: true,
      });
    }

    const generationId = session.metadata?.generation_id;
    const metadataEmail = session.metadata?.email;
    const checkoutEmail =
      session.customer_details?.email || session.customer_email;

    const email = String(metadataEmail || checkoutEmail || "")
      .trim()
      .toLowerCase();

    const credits = Number(session.metadata?.credits || 10);
    const sessionId = String(session.id || "");

    if (
      !generationId ||
      !sessionId ||
      !email ||
      !Number.isInteger(credits) ||
      credits <= 0
    ) {
      console.error("Invalid Stripe checkout metadata:", {
        generationId,
        sessionId,
        email,
        credits,
      });

      return Response.json(
        { error: "Invalid checkout metadata." },
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
      console.error("Generation lookup error:", generationError);

      return Response.json(
        { error: "Could not load generation." },
        { status: 500 }
      );
    }

    if (!generation) {
      return Response.json(
        { error: "Generation not found." },
        { status: 404 }
      );
    }

    if (
      generation.stripe_session_id &&
      generation.stripe_session_id !== sessionId
    ) {
      console.error("Stripe session mismatch.", {
        expected: generation.stripe_session_id,
        received: sessionId,
      });

      return Response.json(
        { error: "Stripe session mismatch." },
        { status: 400 }
      );
    }

    let userId = "";

    const { data: existingProfile, error: profileLookupError } =
      await supabase
        .from("profiles")
        .select("id")
        .ilike("email", email)
        .maybeSingle();

    if (profileLookupError) {
      console.error("Profile lookup error:", profileLookupError);

      return Response.json(
        { error: "Could not find account." },
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
        console.error("Create user error:", createUserError);

        return Response.json(
          { error: "Could not create ApplyFast account." },
          { status: 500 }
        );
      }

      userId = createdUser.user.id;
    }

    const { data: purchaseResult, error: purchaseError } =
      await supabase.rpc("complete_applyfast_purchase", {
        p_user_id: userId,
        p_email: email,
        p_generation_id: generationId,
        p_stripe_session_id: sessionId,
        p_purchase_credits: credits,
      });

    if (purchaseError) {
      console.error("Complete purchase error:", purchaseError);

      return Response.json(
        { error: "Could not complete purchase." },
        { status: 500 }
      );
    }

    return Response.json({
      received: true,
      completed: true,
      result: purchaseResult,
    });
  } catch (error) {
    console.error("ApplyFast Stripe webhook error:", error);

    return Response.json(
      { error: "Webhook failed." },
      { status: 500 }
    );
  }
}
