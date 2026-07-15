"use client"
import HomePage from "@/components/HomePage";
import { LayoutDashboard } from "lucide-react";
import { useState } from "react";
import Network from "@/components/Network";
export default function Home() {
  const [showDashboard, setShowDashboard] = useState(false);
  const refetchRooms = () => {};
  return <>
  <HomePage />
  <span onClick={() => setShowDashboard(!showDashboard)} className="fixed bottom-10 right-10 z-50 flex items-center justify-center w-12 h-12 rounded-full shadow-lg cursor-pointer hover:scale-105 transition-transform duration-200">
    <LayoutDashboard size={40} className="text-white "/>
  </span>
  {showDashboard && <div className="flex justify-center items-center m-auto"><Network popup={showDashboard} setPopup={setShowDashboard} refetchRooms={refetchRooms} /></div>}
  </>;
}