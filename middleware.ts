import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const guestParam = searchParams.get("guest");

  if (!guestParam) return NextResponse.next();

  const token = process.env.GUEST_TOKEN;
  const url = request.nextUrl.clone();
  url.searchParams.delete("guest");

  const response = NextResponse.redirect(url);
  if (token && guestParam === token) {
    response.cookies.set("guest_session", token, { path: "/", sameSite: "lax" });
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|.*\\..*).*)" ],
};
