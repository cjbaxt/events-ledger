import { useState, useEffect } from "react";
import { isLoggedIn, login, getRole } from "../lib/auth";

export default function LoginGate() {
  const [authed, setAuthed] = useState(() => isLoggedIn());
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onAuthChange() { setAuthed(isLoggedIn()); }
    window.addEventListener("auth-change", onAuthChange);
    return () => window.removeEventListener("auth-change", onAuthChange);
  }, []);

  if (authed) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(password);
    } catch {
      setError("Incorrect password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center">
      <div className="w-full max-w-xs px-6">
        <h1 className="font-serif text-3xl text-neutral-900 mb-1">Events Ledger</h1>
        <p className="text-sm text-neutral-400 mb-8">Claire's Cultural Dispatch</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full border border-neutral-200 rounded-lg px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-neutral-400"
            />
            {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-neutral-900 text-white text-sm rounded-lg py-3 hover:bg-neutral-700 transition-colors disabled:opacity-40"
          >
            {loading ? "…" : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
