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

  if (!timestampPart || signatureParts.length === 0) {
    return false;
  }

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

  if (!validSignature) {
    return false;
  }

  const timestampNumber = Number(timestamp);

  if (!Number.isFinite(timestampNumber)) {
    return false;
  }

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

    const validSignature = verifyStripeSignature(
      rawBody,
      signatureHeader,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (!validSignature) {
      console.error("Invalid Stripe webhook signature.");

      return Response.json(
        { error: "Invalid signature." },
        { status: 400 }
      );
    }

    const event = JSON.parse(rawBody);

    if (event.type !== "checkout.session.completed") {
      return Response.json({
        received: true,
      });
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

    const userId = session.metadata?.user_id;
    const credits = Number(session.metadata?.credits || 0);
    const sessionId = session.id;

    if (
      !userId ||
      !sessionId ||
      !Number.isInteger(credits) ||
      credits <= 0
    ) {
      console.error("Invalid Stripe session metadata:", {
        userId,
        credits,
        sessionId,
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

    const { data, error } = await supabase.rpc(
      "grant_purchase_credits",
      {
        p_user_id: userId,
        p_credits: credits,
        p_stripe_session_id: sessionId,
      }
    );

    if (error) {
      console.error("Credit grant error:", error);

      return Response.json(
        { error: "Could not grant credits." },
        { status: 500 }
      );
    }

    return Response.json({
      received: true,
      result: data,
    });
  } catch (error) {
    console.error("Stripe webhook error:", error);

    return Response.json(
      { error: "Webhook failed." },
      { status: 500 }
    );
  }
}
