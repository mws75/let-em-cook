import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getAuthenticatedUserId, getUserById } from "@/lib/auth";
import { createHmac } from "crypto";

function generateMobileToken(userId: number): string {
  const secret = process.env.CLERK_SECRET_KEY!;
  const payload = {
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60, // 90 days
  };
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // If ?start=true, redirect to Clerk sign-in page with return URL
  if (searchParams.get("start") === "true") {
    const returnUrl = `${request.nextUrl.origin}/api/auth/mobile-callback`;
    const signInUrl = `${request.nextUrl.origin}/signin?redirect_url=${encodeURIComponent(returnUrl)}`;
    return NextResponse.redirect(signInUrl);
  }

  // After Clerk sign-in, user should be authenticated
  const user = await currentUser();
  if (!user) {
    // Not authenticated yet — redirect to sign-in
    const returnUrl = `${request.nextUrl.origin}/api/auth/mobile-callback`;
    return NextResponse.redirect(
      `${request.nextUrl.origin}/signin?redirect_url=${encodeURIComponent(returnUrl)}`
    );
  }

  // Get or create the database user
  const dbUserId = await getAuthenticatedUserId();
  const dbUser = await getUserById(dbUserId);

  if (!dbUser) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }

  // Generate a long-lived token for the iOS app
  const token = generateMobileToken(dbUserId);

  // Redirect to iOS app with token and user data
  const userJson = encodeURIComponent(JSON.stringify(dbUser));
  return NextResponse.redirect(`letemcook://auth-callback?token=${token}&user=${userJson}`);
}
