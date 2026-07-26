import { type NextRequest } from "next/server";
import { cookies } from "next/headers";

const COOKIE = "guest_session";

export function isGuestRequest(req: NextRequest): boolean {
  const token = process.env.GUEST_TOKEN;
  return !!token && req.cookies.get(COOKIE)?.value === token;
}

export async function isGuestServer(): Promise<boolean> {
  const token = process.env.GUEST_TOKEN;
  if (!token) return false;
  const store = await cookies();
  return store.get(COOKIE)?.value === token;
}

export function guestDenied() {
  return Response.json({ error: "Read-only guest access" }, { status: 403 });
}
