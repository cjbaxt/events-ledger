import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import AdminView from "@/components/AdminView";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 pt-4 pb-24 md:pt-20 md:pb-8">
        <h1 className="font-serif text-2xl text-neutral-900 mt-4 mb-8">Data completeness</h1>
        <AdminView />
      </main>
    </div>
  );
}
