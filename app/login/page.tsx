import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm space-y-8 px-6">
        <div className="text-center">
          <h1 className="font-serif text-3xl text-neutral-900">events ledger</h1>
          <p className="mt-1 text-sm text-neutral-400">ledger.claireheaded.com</p>
        </div>

        <form action={login} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-[10px] uppercase tracking-widest text-neutral-400 mb-1.5">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-800 placeholder-neutral-300 focus:outline-none focus:border-neutral-400"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-[10px] uppercase tracking-widest text-neutral-400 mb-1.5">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-800 placeholder-neutral-300 focus:outline-none focus:border-neutral-400"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-neutral-900 px-3 py-2.5 text-sm text-white hover:bg-neutral-700 transition-colors"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
