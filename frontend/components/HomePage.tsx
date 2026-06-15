"use client";

import { useState } from "react";
import Navbar from "./Navbar";
import GetRooms from "./GetRooms";
import WorldChat from "./WorldChat";

export default function HomePage() {
  const [value, setValue] = useState<"rooms" | "chat">("rooms");

  return (
    // h-screen + flex-col so Navbar shrinks to its natural height and
    // <main> gets exactly the remaining space — no vh math needed anywhere.
    <div className="h-screen flex flex-col bg-zinc-950 text-white overflow-hidden">
      <Navbar value={value} setValue={setValue} />
      <main className="flex-1 overflow-hidden">
        {value === "rooms" ? <GetRooms /> : <WorldChat />}
      </main>
    </div>
  );
}