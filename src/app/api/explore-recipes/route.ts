import { NextRequest, NextResponse } from "next/server";

// TODO: Implement explore recipes API
export async function GET(request: NextRequest) {
  return NextResponse.json({ recipes: [], message: "Not implemented" }, { status: 501 });
}
