"use client";

import { Send } from "lucide-react";
import { useState } from "react";

export default function ChatPanel() {
  const [message, setMessage] =
    useState("");

  return (
    <div className="w-[320px] border-l border-zinc-800 bg-zinc-900 flex flex-col">

      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <h2 className="font-semibold">
          Room Chat
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="bg-zinc-800 p-2 rounded-lg">
          Hello everyone 👋
        </div>

        <div className="bg-zinc-800 p-2 rounded-lg">
          Welcome to the room
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-zinc-800">
        <div className="flex gap-2">
          <input
            value={message}
            onChange={(e) =>
              setMessage(e.target.value)
            }
            placeholder="Type message..."
            className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 outline-none"
          />

          <button className="bg-indigo-600 px-3 rounded-lg">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}