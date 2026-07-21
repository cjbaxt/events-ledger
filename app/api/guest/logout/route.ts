import { NextResponse } from "next/server";

export async function GET() {
  const res = NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL ?? "https://ledger.claireheaded.com"));
  res.cookies.set("guest_session", "", { maxAge: 0, path: "/" });
  return res;
}
