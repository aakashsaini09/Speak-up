"use client";

import { socket } from "@/lib/socket";
import { useUser } from "@clerk/nextjs";
import { Send, Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
export default function WorldChat() {
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef(null);
  const [message, setMessage] = useState("");
  const [onlineCount, setOnlineCount] = useState(112);
  const [messages, setMessages] = useState([])
  const { user } = useUser();
  useEffect(() => {
    // Scroll to the bottom element whenever messages change
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
  //   {
  //     id: 2,
  //     name: "John",
  //     image:
  //       "https://i.pravatar.cc/100?img=2",
  //     text: "Anyone learning English?",
  //     time: "10:23",
  //   },
  // ];
  useEffect(() => {
    socket.emit("world-chat-join",
      {
        userId: user?.id,
        name: user?.firstName,
        imageUrl: user?.imageUrl,
      }
    );
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
        "world-chat-leave", { userId: user?.id}
      );
      socket.off(
        "world-chat-count"
      );
      socket.off(
        "world-chat-message"
      );
    };
  }, []);

  function sendMessage() {
    if(!user || !user?.id){
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
  // const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  //   if (e.key === "Enter") {
  //     e.preventDefault(); 
  //     sendMessage();
  //   }
  // };

  return (
    <div className="h-[90vh] w-full bg-zinc-950 text-white flex justify-center p-4 pt-0">
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
              {onlineCount <= 1 ? onlineCount : onlineCount - 1} Online
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
                  }`}
              >
                <div className={`flex items-center gap-3 max-w-[75%] ${isOwnMessage ? "flex-row-reverse" : ""  }`}  >
                  <img src={msg.image} alt="" className="w-14 h-14 flex rounded-full object-cover shrink-0" />
                  <div className={`${isOwnMessage ? "text-right" : "" }`} >
                    <div className={`flex items-center gap-2 ${isOwnMessage ? "justify-end" : ""}`} >
                      <span className="font-medium">
                        {msg.name}
                      </span>

                      <span className="text-xs text-zinc-500">
                        {msg.time}
                      </span>
                    </div>

                    <div
                      className={`mt-1 px-4 py-2 rounded-2xl inline-block wrap-break-word ${isOwnMessage
                          ? "bg-indigo-600 text-white text-left"
                          : "bg-zinc-800"
                        }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-zinc-800 p-4">
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

            <button ref={buttonRef} onClick={sendMessage} className="bg-indigo-600 hover:bg-indigo-500 px-5 rounded-xl transition">
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}