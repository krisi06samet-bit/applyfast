import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json(
      { success: true },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );

    const allCookies = request.cookies.getAll();

    for (const cookie of allCookies) {
      const cookieName = cookie.name.toLowerCase();

      if (
        cookieName.startsWith("sb-") ||
        cookieName.includes("supabase")
      ) {
        response.cookies.set(cookie.name, "", {
          path: "/",
          expires: new Date(0),
          maxAge: 0,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }
    }

    return response;
  } catch (error) {
    console.error("ApplyFast logout route error:", error);

    return NextResponse.json(
      { error: "Could not sign out." },
      { status: 500 }
    );
  }
}
