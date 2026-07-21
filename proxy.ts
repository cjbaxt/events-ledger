import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const GUEST_COOKIE = "guest_session";

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // If a valid guest token is in the URL, set the guest cookie and redirect clean
  const token = searchParams.get("token");
  if (token && token === process.env.GUEST_TOKEN) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("token");
    const res = NextResponse.redirect(url);
    res.cookies.set(GUEST_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return res;
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Authenticated users always get full access — guest cookie is ignored
  if (user) return supabaseResponse;

  // No real session: fall back to guest cookie for read-only access
  if (request.cookies.get(GUEST_COOKIE)?.value === "1") {
    return NextResponse.next({ request });
  }

  if (pathname !== "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
