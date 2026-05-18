import { NextResponse } from "next/server";

const CODE = process.env.SITE_PASSWORD ?? "1019";

export async function POST(req: Request) {
  const { code } = await req.json();
  if (code !== CODE) {
    return NextResponse.json({ error: "Invalid access code" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("psx_auth_v2", "ok", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
  return res;
}
