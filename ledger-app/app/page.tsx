import { logout } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">Events Ledger</h1>
        <p className="text-gray-400 text-sm mb-8">Signed in as {user?.email}</p>
        <p className="text-gray-500">Events coming soon.</p>
        <form action={logout} className="mt-8">
          <button type="submit" className="text-sm text-gray-500 hover:text-gray-300">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
