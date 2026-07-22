import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Returns a 401 Response if the request has no valid Supabase session, otherwise null. */
export async function requireOwner(): Promise<Response | null> {
  const store = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => store.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}
