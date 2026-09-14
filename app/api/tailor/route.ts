export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      return Response.json(
        { error: "Stripe is not configured." },
        { status: 500 }
      );
    }

    const origin = new URL(request.url).origin;

    const params = new URLSearchParams();

    params.append("mode", "payment");
    params.append("success_url", `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`);
    params.append("cancel_url", `${origin}/?payment=cancelled`);

    params.append("line_items[0][quantity]", "1");
    params.append("line_items[0][price_data][currency]", "eur");
    params.append("line_items[0][price_data][unit_amount]", "699");

    params.append(
      "line_items[0][price_data][product_data][name]",
      "ApplyFast — 10 Applications"
    );

    params.append(
      "line_items[0][price_data][product_data][description]",
      "10 full CV and cover letter applications"
    );

    const stripeResponse = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    const session = await stripeResponse.json();

    if (!stripeResponse.ok) {
      console.error("Stripe error:", session);

      return Response.json(
        { error: "Could not start checkout." },
        { status: 500 }
      );
    }

    return Response.json({
      url: session.url,
    });
  } catch (error) {
    console.error("Checkout error:", error);

    return Response.json(
      { error: "Could not start checkout." },
      { status: 500 }
    );
  }
}
