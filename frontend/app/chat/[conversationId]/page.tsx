"use client";

import axios from "axios";
import { useAuth, useUser } from "@clerk/nextjs";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { socket } from "@/lib/socket";

type ChatUser = {
  _id: string;
  firstName: string;
  imageUrl: string;
  clerkId: string;
};

type ConversationSummary = {
  conversationId: string;
  user: ChatUser | null;
  lastMessage: string;
  lastMessageAt: string;
};

type MessageItem = {
  _id: string;
  conversationId: string;
  sender: ChatUser;
  type: "text" | "image";
  text: string;
  imageUrl?: string;
  createdAt: string;
};

export default function ConversationPage() {
  const router = useRouter();
  const { user } = useUser();
  const { getToken } = useAuth();
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversation, setConversation] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const otherUser = useMemo(() => conversation?.user ?? null, [conversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!user?.id || !conversationId) return;

    socket.emit("join-chat", { conversationId, clerkId: user.id });

    const handleNewMessage = (message: MessageItem) => {
      if (String(message.conversationId) !== String(conversationId)) return;
      setMessages((prev) => [...prev, message]);
    };

    socket.on("new-message", handleNewMessage);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.emit("leave-chat", { conversationId });
    };
  }, [conversationId, user?.id]);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [conversationRes, messagesRes] = await Promise.all([
          axios.get(`${backendUrl}/api/chat`, { headers, signal: controller.signal }),
          axios.get(`${backendUrl}/api/chat/${conversationId}/messages`, { headers, signal: controller.signal }),
        ]);

        const conversations = Array.isArray(conversationRes.data)
          ? conversationRes.data
          : conversationRes.data?.conversations ?? [];

        const foundConversation = conversations.find(
          (item: ConversationSummary) => String(item.conversationId) === String(conversationId)
        ) ?? null;

        setConversation(foundConversation);
        setMessages(Array.isArray(messagesRes.data) ? messagesRes.data : []);
      } catch (error: any) {
        if (controller.signal.aborted) return;
        const message = error?.response?.data?.message ?? error?.message ?? "Failed to load chat";
        toast.error(message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [backendUrl, conversationId, getToken]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || !conversationId) return;

    setSending(true);
    try {
      socket.emit("send-message", {
        conversationId,
        text: trimmed,
      });
      setText("");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500">
          <MessageCircle size={18} className="animate-pulse" />
          Loading chat...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full border border-zinc-800 hover:border-zinc-600 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex items-center gap-3 min-w-0">
            <img
              src={otherUser?.imageUrl || "https://ui-avatars.com/api/?name=Chat"}
              alt={otherUser?.firstName || "Chat"}
              className="w-11 h-11 rounded-full object-cover border border-zinc-700"
            />
            <div className="min-w-0">
              <h1 className="text-lg font-semibold leading-tight truncate">
                {otherUser?.firstName || "Chat"}
              </h1>
              <p className="text-xs text-zinc-500 truncate">
                {conversation?.lastMessage ? conversation.lastMessage : "Start the conversation"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 h-full flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
            {messages.length === 0 ? (
              <div className="h-full min-h-[40vh] flex items-center justify-center text-zinc-600">
                No messages yet.
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = String(message.sender.clerkId) === String(user?.id);

                return (
                  <div key={message._id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                    <div className={`flex items-end gap-3 max-w-[80%] ${isOwn ? "flex-row-reverse" : ""}`}>
                      <img
                        src={message.sender.imageUrl}
                        alt={message.sender.firstName}
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                      <div className={`rounded-2xl px-4 py-2 text-sm ${isOwn ? "bg-indigo-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-100"}`}>
                        {message.text}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && text.trim()) {
                  sendMessage();
                }
              }}
              placeholder="Type a message..."
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={sendMessage}
              disabled={!text.trim() || sending}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <Send size={16} />
              Send
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
