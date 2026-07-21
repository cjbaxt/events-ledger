import { type NextRequest } from "next/server";
import { cookies } from "next/headers";

const COOKIE = "guest_session";

export function isGuestRequest(req: NextRequest): boolean {
  return req.cookies.get(COOKIE)?.value === "1";
}

export async function isGuestServer(): Promise<boolean> {
  const store = await cookies();
  return store.get(COOKIE)?.value === "1";
}

export function guestDenied() {
  return Response.json({ error: "Read-only guest access" }, { status: 403 });
}
