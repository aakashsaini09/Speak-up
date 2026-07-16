"use client";

import { Send, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getToken, useUser } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { socket } from "@/lib/socket";
import axios from "axios";

interface MessageType {
  id: string;
  name: string;
  image: string;
  time: string;
  text: string;
  mediaUrl?: string;
}

type RoomMessageData = {
  id?: string;
  firstName?: string;
  imageUrl?: string;
  message?: string;
  mediaUrl?: string;
};

export default function ChatPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
  const { id: roomId } = useParams();
  // Bug 2 fix: ref must be INSIDE the scrollable container
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MessageType[]>([]);

  useEffect(() => {
    const handleRoomMessage = (data: RoomMessageData) => {
      if (
        !data ||
        typeof data !== "object" ||
        ((typeof data.message !== "string" || !data.message.trim()) &&
          typeof data.mediaUrl !== "string")
      ) {
        return;
      }

      const text = typeof data.message === "string" ? data.message.trim() : "";
      const mediaUrl = typeof data.mediaUrl === "string" ? data.mediaUrl : "";

      const newMsg: MessageType = {
        id: data.id ?? "",
        name: data.firstName || "Anonymous",
        image:
          data.imageUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(data.firstName || "?")}`,
        text,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        mediaUrl,
      };

      setMessages((prev) => [...prev, newMsg]);
    };

    socket.on("room-message", handleRoomMessage);

    return () => {
      socket.off("room-message", handleRoomMessage);
    };
  }, []);

  const uploadImage = async (file: File) => {
    const token = await getToken();
    const formData = new FormData();
    formData.append("image", file);
    formData.append("roomId", String(roomId));

    const res = await axios.post(
      `${backendUrl}/api/upload/room-image`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (res.data?.imageUrl) {
      socket.emit("room-message", {
        id: user?.id,
        firstName: user?.firstName,
        imageUrl: user?.imageUrl,
        message: "",
        mediaUrl: res.data.imageUrl,
      });
    }
  };
  // Auto-scroll whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage() {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    socket.emit("room-message", {
      id: user?.id,
      message: trimmedMessage,
      imageUrl: user?.imageUrl,
      firstName: user?.firstName,
    });

    setMessage("");
    inputRef.current?.focus();
  }

  return (
    <div className="w-full h-full flex flex-col bg-zinc-900">
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-violet-600 p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-zinc-500 text-sm mt-4 select-none">
            No messages yet. Say hi bro!
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
                    className={`px-2 py-1 rounded-2xl inline-block wrap-break-words text-sm ${
                      isOwnMessage
                        ? "text-white text-left"
                        : "text-zinc-100"
                    }`}
                  >
                    {msg.text && <p>{msg.text}</p>}
                    {msg.mediaUrl && (
                      <img
                        src={msg.mediaUrl}
                        alt="Uploaded image"
                        className={`max-w-full rounded-xl border border-zinc-700 ${
                          msg.text ? "mt-2" : ""
                        }`}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

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

          <input
            id="chat-image-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                uploadImage(file);
                e.currentTarget.value = "";
              }
            }}
          />

          <label
            htmlFor="chat-image-input"
            className="bg-zinc-800 px-3 rounded-lg hover:bg-zinc-700 flex items-center justify-center cursor-pointer"
            title="Upload image"
          >
            <Upload size={16} />
          </label>

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