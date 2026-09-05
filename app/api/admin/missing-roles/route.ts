import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();

  const [personsRes, ensemblesRes] = await Promise.all([
    db.from("person").select("id, name, roles").order("name"),
    db.from("ensemble").select("id, name, roles").order("name"),
  ]);

  const persons = (personsRes.data ?? []).filter(
    (p: { roles: string[] | null }) => !p.roles || p.roles.length === 0
  );
  const ensembles = (ensemblesRes.data ?? []).filter(
    (e: { roles: string[] | null }) => !e.roles || e.roles.length === 0
  );

  return NextResponse.json({ persons, ensembles });
}
