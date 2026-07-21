"use client";
import Nav from "@/components/Nav";
import AddEvent from "@/components/AddEvent";

export default function AddPage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="max-w-lg mx-auto px-4 pt-4 pb-24 md:pt-20 md:pb-8">
        <AddEvent />
      </main>
    </div>
  );
}
