import Nav from "@/components/Nav";

const ABOUT = `Events Ledger is my personal archive of live performances I've attended. Think theatre, ballet, opera, circus, comedy, magic, classical music, cabaret, gigs, drag, and whatever else I could talk myself into.

The data is patchy, which is entirely past Claire's fault. Past Claire had a very loose definition of record-keeping. She wrote "fringe show" in her calendar like that would mean something later. She let other people buy the tickets and then had no idea what she'd paid. She went to things spontaneously and then just… didn't write them down. Some things lived on paper, in her head, or in friends calendars and were therefore lost completely.

So - recent years are well-documented, but anything pre-2025 is reconstructed from calendar entries, email confirmations, asking my mum/friends, and digging through my forgetful brain. Prices are sometimes estimates. Casts are sometimes incomplete. And dates are sometimes approximate.

But now, for future Claire, this will become a place to memorialise all the great events I see, a place to write my small takes, take-downs or post a link to a full length essay. A ledger of joy, connection and performance artistry.`;

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-24 md:pt-20 md:pb-8">
        <h1 className="font-serif text-2xl text-neutral-900 mt-4 mb-8">About</h1>
        <div className="space-y-5 text-sm text-neutral-700 leading-relaxed">
          {ABOUT.split(/\n\n+/).map((p, i) => <p key={i}>{p}</p>)}
        </div>
        <div className="mt-12 pt-8 border-t border-neutral-100 flex items-center justify-center">
          <span className="font-serif text-2xl text-neutral-200 select-none">⁂</span>
        </div>
      </main>
    </div>
  );
}
