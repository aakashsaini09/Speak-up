"use client";

import { useState } from "react";
import Navbar from "./Navbar";
import GetRooms, { fetchRoomFunction } from "./GetRooms";
import WorldChat from "./WorldChat";

export default function HomePage() {
  const [value, setValue] = useState<"rooms" | "chat">("rooms");
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshRooms = () => {
    fetchRoomFunction(
      backendUrl,
      setRooms,
      setLoading
    );
  };

  return (
    // h-screen + flex-col so Navbar shrinks to its natural height and
    // <main> gets exactly the remaining space — no vh math needed anywhere.
    <div className="h-screen flex flex-col bg-zinc-950 text-white">
      <Navbar value={value} setValue={setValue} refreshRooms={refreshRooms} />
      {value == 'rooms' && <section className="min-h-[25vh] w-full flex justify-center items-center font-semibold text-3xl">
  Find Your Voice. Speak Up.
</section>}
      <main className="flex-1">
        {value === "rooms" ? <GetRooms rooms={rooms} loading={loading} refresh={refreshRooms} /> : <WorldChat />}
      </main>
    </div>
  );
}