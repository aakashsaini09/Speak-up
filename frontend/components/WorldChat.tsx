"use client";

import { socket } from "@/lib/socket";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import { Send, Globe, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
export default function WorldChat() {
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
  const buttonRef = useRef(null);
  const [message, setMessage] = useState("");
  const [onlineCount, setOnlineCount] = useState(10);
  const [messages, setMessages] = useState([])
  const { user } = useUser();
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  // const messages = [
  //   {
  //     id: 1,
  //     name: "Aakash",
  //     image:
  //       "https://i.pravatar.cc/100?img=1",
  //     text: "Hello everyone 👋",
  //     time: "10:22",
  //   },
  // ];
  useEffect(() => {
    if (!user) return;
    socket.emit("world-chat-join",
      {
        userId: user?.id,
        name: user?.firstName,
        imageUrl: user?.imageUrl,
      }
    );
    getMessages()
    socket.on("world-chat-count", count => {
      // console.log("count is: ", count)
      setOnlineCount(count);
    }
    );
    socket.on("world-chat-message",
      data => {
        // console.log("data: ", data);
        const newMsg = {
          id: data?.id,
          name: data?.firstName || "Anonymous",
          image: data?.imageUrl || "https://i.pravatar.cc/100?img=3",
          text: data.message,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, newMsg])
      }
    );
    return () => {
      socket.emit(
        "world-chat-leave", { userId: user?.id }
      );
      socket.off(
        "world-chat-count"
      );
      socket.off(
        "world-chat-message"
      );
    };
  }, []);
  const getMessages = async () => {
    const res = await axios.get(`${backendUrl}/api/messages`)
    // console.log("response is: ", res.data.messages)
    let data = res.data.messages;
    setMessages(
      data.map((msg) => ({
        name: msg.firstName,
        image: msg.imageUrl,
        time: formatMessageTime(
          msg.createdAt
        ),
        text: msg.message,
        id: msg.userId,
      }))
    );
    // console.log("messages: ", messages)
  }
  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();

    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(
      diffMs / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    if (diffDays === 1) {
      return "Yesterday";
    }

    if (diffDays < 7) {
      return date.toLocaleDateString([], {
        weekday: "short",
      });
    }

    if (
      date.getFullYear() ===
      now.getFullYear()
    ) {
      return date.toLocaleDateString([], {
        day: "numeric",
        month: "short",
      });
    }

    return date.toLocaleDateString([], {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };
  function sendMessage() {
    if (!user || !user?.id) {
      toast.error("Please login first!")
      return;
    }
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    socket.emit("world-chat-message", {
      message: trimmedMessage,
      id: user?.id,
      imageUrl: user?.imageUrl,
      firstName: user?.firstName,
    });
    setMessage("");
    inputRef.current?.focus();
  }
  const deleteMessage = (id: string) => {
    toast("Not working yet!")
  }
  return (
    <div className="sm:h-[82vh] md:h-[90vh] w-full bg-zinc-950 text-white flex justify-center p-4 pt-0">
      <div className="w-full max-w-full sm:px-4 md:px-9 bg-zinc-900 border border-zinc-800 rounded-md flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="shrink-0 flex items-center px-4 justify-between sm:px-4 md:px-6 py-4 border-b border-zinc-800">
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
        <div className="flex-1 overflow-y-auto scrollbar scrollbar-thumb-indigo-600 scrollbar-track-transparent p-6 space-y-4">
          {messages.map((msg, index) => {
            const isOwnMessage = String(msg.id) == user?.id;
            return (
              <div key={index}
                className={`flex ${isOwnMessage
                  ? "justify-end"
                  : "justify-start"
                  }`}>
                <div className={`flex items-center gap-1 max-w-[75%] ${isOwnMessage ? "flex-row-reverse" : ""}`}  >
                  <img src={msg.image} alt="" className="w-11 h-11 flex rounded-full object-cover shrink-0" />
                  <div className={`${isOwnMessage ? "text-right" : ""}`} >
                    <div className={`flex items-center gap-2 ${isOwnMessage ? "justify-end" : ""}`} >
                      <span className="font-medium">
                        {msg.name}
                      </span>

                      <span className="text-xs text-zinc-500">
                        {msg.time}
                      </span>
                    </div>
                    <div
  className={`
    group flex items-center gap-2
    ${isOwnMessage ? "justify-end" : ""}
  `}
>
  {isOwnMessage && (
    <button
      onClick={() => deleteMessage(msg._id)}
      className="
        opacity-0
        group-hover:opacity-100
        transition
        text-zinc-400
        hover:text-red-500
      "
    >
      <Trash2 size={14} />
    </button>
  )}

  <div
    className={`
      px-4 py-2 rounded-2xl text-left
      ${isOwnMessage
        ? "bg-indigo-600"
        : "bg-zinc-800"}
    `}
  >
    {msg.text}
  </div>
</div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        {/* Input */}
        <div className="shrink-0 border-t border-zinc-800 p-4">
          <div className="flex gap-3">
            <input
              value={message}
              onKeyDown={(e) => {
                if (e.key === "Enter" && message.trim()) {
                  sendMessage();
                }
              }}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              placeholder="Say hello to the world..."
              className="flex-1 bg-zinc-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button ref={buttonRef} onClick={sendMessage} className="bg-indigo-600 cursor-pointer hover:bg-indigo-500 px-5 rounded-xl transition">
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}