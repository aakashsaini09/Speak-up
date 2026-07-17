"use client";

import HomePage from "@/components/HomePage";
import Network from "@/components/Network";
import { LayoutDashboard } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";

export default function Home() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
  const refetchRooms = () => {};

  const refreshUnread = useCallback(async () => {
    if (!isSignedIn || !backendUrl) {
      setUnreadCount(0);
      return;
    }
    try {
      const token = await getToken();
      if (!token) return;
      const res = await axios.get(`${backendUrl}/api/chat/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 12000,
      });
      setUnreadCount(Number(res.data?.unreadCount) || 0);
    } catch {
      // Keep last known count on transient failures
    }
  }, [backendUrl, getToken, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) return;
    refreshUnread();
    const id = setInterval(refreshUnread, 30000);
    return () => clearInterval(id);
  }, [isLoaded, refreshUnread]);

  // Refresh when the Network panel closes (user may have read chats)
  useEffect(() => {
    if (!showDashboard) refreshUnread();
  }, [showDashboard, refreshUnread]);

  const badgeLabel = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <>
      <HomePage />
      <button
        type="button"
        onClick={() => setShowDashboard((open) => !open)}
        aria-label={
          unreadCount > 0
            ? `Open network, ${unreadCount} unread messages`
            : "Open network"
        }
        className="fixed bottom-10 right-10 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 shadow-lg cursor-pointer hover:scale-105 transition-transform duration-200"
      >
        <LayoutDashboard size={28} className="text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-indigo-600 text-white text-[11px] font-semibold flex items-center justify-center ring-2 ring-zinc-950">
            {badgeLabel}
          </span>
        )}
      </button>
      {showDashboard && (
        <Network
          popup={showDashboard}
          setPopup={setShowDashboard}
          refetchRooms={refetchRooms}
          onUnreadChange={setUnreadCount}
        />
      )}
    </>
  );
}
