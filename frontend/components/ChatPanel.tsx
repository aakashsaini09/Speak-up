"use client";

import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { socket } from "@/lib/socket";

interface MessageType {
  id: string;
  name: string;
  image: string;
  time: string;
  text: string;
}

export default function ChatPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  // Bug 2 fix: ref must be INSIDE the scrollable container
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MessageType[]>([]);

  useEffect(() => {
    socket.on("room-message", (data) => {
      // Bug 1 fix: guard against non-object payloads (e.g. a plain string
      // emitted on "join" events). Only accept messages that are objects
      // with a non-empty `message` string so no phantom bubbles appear.
      if (
        !data ||
        typeof data !== "object" ||
        typeof data.message !== "string" ||
        !data.message.trim()
      ) {
        return;
      }

      const newMsg: MessageType = {
        id: data.id ?? "",
        name: data.firstName || "Anonymous",
        image: data.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.firstName || "?")}`,
        text: data.message,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, newMsg]);
    });

    return () => {
      socket.off("room-message");
    };
  }, []);

  // Auto-scroll whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage() {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    socket.emit("room-message", {
      message: trimmedMessage,
      id: user?.id,
      imageUrl: user?.imageUrl,
      firstName: user?.firstName,
    });

    setMessage("");
    inputRef.current?.focus();
  }

  return (
    // Bug 3 fix: drop the fixed w-[320px] — use w-full h-full so the panel
    // fills whatever container RoomPage puts it in, and rely on flex-col +
    // min-h-0 to keep everything on-screen.
    <div className="w-full h-full flex flex-col bg-zinc-900">
      {/* Messages — flex-1 + min-h-0 lets this shrink so the input stays visible */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-violet-600 p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-zinc-500 text-sm mt-4 select-none">
            No messages yet. Say hi!
          </p>
        )}

        {messages.map((msg, index) => {
          const isOwnMessage = String(msg.id) === user?.id;
          return (
            <div
              key={index}
              className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex items-end gap-2 max-w-[80%] ${
                  isOwnMessage ? "flex-row-reverse" : ""
                }`}
              >
                <img
                  src={msg.image}
                  alt={msg.name}
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                />
                <div className={isOwnMessage ? "text-right" : ""}>
                  <div
                    className={`flex items-center gap-2 mb-1 ${
                      isOwnMessage ? "justify-end" : ""
                    }`}
                  >
                    <span className="text-sm font-medium">{msg.name}</span>
                    <span className="text-xs text-zinc-500">{msg.time}</span>
                  </div>
                  <div
                    className={`px-4 py-2 rounded-2xl inline-block break-words text-sm ${
                      isOwnMessage
                        ? "bg-indigo-600 text-white text-left"
                        : "bg-zinc-800 text-zinc-100"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Bug 2 fix: sentinel div is INSIDE the scrollable container */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input — always pinned to the bottom because it's after the flex-1 sibling */}
      <div className="p-3 border-t border-zinc-800 shrink-0 bottom-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={message}
            onKeyDown={(e) => {
              if (e.key === "Enter" && message.trim()) {
                sendMessage();
              }
            }}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={sendMessage}
            disabled={!message.trim()}
            className="bg-indigo-600 px-3 rounded-lg hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}