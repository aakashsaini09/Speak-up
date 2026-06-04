"use client";

import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { socket } from "@/lib/socket";
interface messageType{
  id: string;
  name: string;
  image: string;
  time: string;
  text: string;
}
export default function ChatPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef(null);
  const { user } = useUser()
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<messageType[]>([])
  useEffect(() => {
    socket.on('room-message', data=> {
      const newMsg = {
          id: data?.id,
          name: data?.firstName || "Anonymous",
          image: data?.imageUrl || "https://i.pravatar.cc/100?img=3",
          text: data.message,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, newMsg])
    })
    return() => {
      socket.off('room-message')
    }
  }, [])
  function sendMessage() {
      const trimmedMessage = message.trim();
      if (!trimmedMessage) return;
  
      socket.emit("room-message", {
        message: trimmedMessage,
        id: user?.id,
        imageUrl: user?.imageUrl,
        firstName: user?.firstName,
      });
    //    socket.on("room-message", (data) => {
    //   console.log(data);
    // });
      setMessage("");
      inputRef.current?.focus();
    }
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
        {/* <div className="bg-zinc-800 p-2 rounded-lg">
          Hello everyone 👋
        </div>

        <div className="bg-zinc-800 p-2 rounded-lg">
          Welcome to the room
        </div> */}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-zinc-800">
        <div className="flex gap-2">
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
            placeholder="Type message..."
            className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 outline-none"
          />

          <button ref={buttonRef} onClick={sendMessage} className="bg-indigo-600 px-3 rounded-lg">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}