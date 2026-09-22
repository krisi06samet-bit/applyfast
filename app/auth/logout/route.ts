import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json(
      {
        success: true,
      },
      { status: 200 }
    );

    const cookies = request.cookies.getAll();

    for (const cookie of cookies) {
      const name = cookie.name.toLowerCase();

      if (
        name.startsWith("sb-") ||
        name.includes("supabase")
      ) {
        response.cookies.set(cookie.name, "", {
          path: "/",
          expires: new Date(0),
          maxAge: 0,
        });
      }
    }

    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
