"use client";

import { socket } from "@/lib/socket";
import { useUser } from "@clerk/nextjs";
import { Send, Globe } from "lucide-react";
import { useEffect, useState } from "react";

export default function WorldChat() {
  const [message, setMessage] = useState("");
  const [onlineCount, setOnlineCount] = useState(112);
    const {user} = useUser();
  const messages = [
    {
      id: 1,
      name: "Aakash",
      image:
        "https://i.pravatar.cc/100?img=1",
      text: "Hello everyone 👋",
      time: "10:22",
    },
    {
      id: 2,
      name: "John",
      image:
        "https://i.pravatar.cc/100?img=2",
      text: "Anyone learning English?",
      time: "10:23",
    },
  ];
  useEffect(() => {
  socket.emit("world-chat-join", {
      userId: user?.id,
      name: user?.firstName,
      imageUrl: user?.imageUrl,
    });
  socket.on( "world-chat-count", count => {
      setOnlineCount(count);
    });

  return () => {
    socket.emit("world-chat-leave");
    socket.off("world-chat-count");
  };
}, []);
  return (
    <div className="h-[85vh] bg-zinc-950 text-white flex justify-center p-4 pt-0">
      <div className="w-full max-w-5xl bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Globe size={24} />
            <h1 className="text-xl font-semibold">
              World Chat
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-zinc-800 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm">
              {onlineCount} Online
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {messages.map((msg) => (
            <div
              key={msg.id}
              className="flex gap-3"
            >
              <img
                src={msg.image}
                alt=""
                className="w-10 h-10 rounded-full object-cover"
              />

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {msg.name}
                  </span>

                  <span className="text-xs text-zinc-500">
                    {msg.time}
                  </span>
                </div>

                <div className="bg-zinc-800 mt-1 px-4 py-2 rounded-2xl inline-block">
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-zinc-800 p-4">
          <div className="flex gap-3">
            <input
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              placeholder="Say hello to the world..."
              className="flex-1 bg-zinc-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <button className="bg-indigo-600 hover:bg-indigo-500 px-5 rounded-xl transition">
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}