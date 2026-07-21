"use client";
import Nav from "@/components/Nav";
import AddEvent from "@/components/AddEvent";

export default function AddPage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="pt-14 pb-20 md:pb-8 max-w-lg mx-auto px-4 py-6 md:py-10">
        <AddEvent />
      </main>
    </div>
  );
}
