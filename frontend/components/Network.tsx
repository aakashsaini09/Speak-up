"use client";

import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MessageCircle,
  UserCheck,
  UserX,
  X,
  Users,
  UserPlus,
  Clock,
  Loader2,
  HeartCrack,
  RefreshCw,
} from "lucide-react";
import { Dialog, DialogContent } from "./ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "All" | "Friends" | "Following" | "Requests";

type Friend = {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    imageUrl: string;
    clerkId: string;
    friendshipId?: string;
  };
  _id: string;
};

type ConversationRow = {
  conversationId: string;
  user: {
    _id: string;
    firstName: string;
    imageUrl: string;
    clerkId: string;
  } | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};

type Request = {
  _id: string;
  firstName: string;
  lastName: string;
  imageUrl: string;
  clerkId: string;
  friendshipId: string;
};

// ─── Shared axios instance ─────────────────────────────────────────────────────
// A single, generous timeout so a slow/hung backend call can never leave the
// UI spinning forever — it will fail predictably instead, and we can offer a
// retry. 12s is comfortably above a normal response but short enough that the
// user isn't staring at a spinner indefinitely.
const api = axios.create({ timeout: 12000 });

// ─── Main component ───────────────────────────────────────────────────────────

const TABS: Tab[] = ["All", "Friends", "Following", "Requests"];

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  All:       <Users size={13} />,
  Friends:   <UserCheck size={13} />,
  Following: <Clock size={13} />,
  Requests:  <UserPlus size={13} />,
};
interface Props {
  popup: boolean;
  setPopup: (open: boolean) => void;
  refetchRooms: () => void;
  onUnreadChange?: (count: number) => void;
}
export default function Network({ popup, setPopup, onUnreadChange }: Props) {
  const { user } = useUser();
  const { getToken, isSignedIn } = useAuth();
  const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

  if (!user) {
    toast.error("Please login first");
    setPopup(false);
  }
  const [tab, setTab] = useState<Tab>("All");
  const [selected, setSelected] = useState("social");
  const [chatUnread, setChatUnread] = useState(0);

  const handleUnreadChange = (count: number) => {
    setChatUnread(count);
    onUnreadChange?.(count);
  };

  // Prefetch total unread so the Chats tab badge shows even before opening Chats
  useEffect(() => {
    if (!popup || !isSignedIn || !base) return;
    const controller = new AbortController();
    (async () => {
      try {
        const token = await getToken();
        const res = await api.get(`${base}/api/chat/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const count = Number(res.data?.unreadCount) || 0;
        handleUnreadChange(count);
      } catch {
        // ignore
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popup, isSignedIn, base, getToken]);

  return (
    <Dialog open={popup} onOpenChange={setPopup}>
      <DialogContent className="sm:max-w-md md:max-w-2xl h-[80vh] bg-zinc-900 border border-zinc-800 rounded-2xl p-0 overflow-hidden flex flex-col gap-0">
        {/* Header */}
        <div className="h-14 flex items-center justify-around px-5 border-b border-zinc-800 shrink-0">
          <h2
            onClick={() => setSelected("social")}
            className={`cursor-pointer text-sm ${selected == "social" ? "border-b-2 border-yellow-500 text-red-500" : "text-zinc-100"} font-semibold tracking-wide`}
          >
            Social
          </h2>
          <h2
            onClick={() => setSelected("chat")}
            className={`relative cursor-pointer text-sm ${selected == "chat" ? "border-b-2 border-yellow-500 text-red-500" : "text-zinc-100"} font-semibold tracking-wide`}
          >
            Chats
            {chatUnread > 0 && (
              <span className="absolute -top-2 -right-5 min-w-4 h-4 px-1 rounded-full bg-indigo-600 text-white text-[10px] font-semibold flex items-center justify-center">
                {chatUnread > 9 ? "9+" : chatUnread}
              </span>
            )}
          </h2>
        </div>

        {selected == "social" ? (
          <>
            <div className="h-12 flex items-center border-b border-zinc-800 px-2 shrink-0">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`h-full flex items-center gap-1.5 px-3 text-xs font-medium transition-colors relative ${
                    tab === t ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {TAB_ICONS[t]}
                  {t}
                  {tab === t && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              <NetworkContent tab={tab} />
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <ChatContent onUnreadChange={handleUnreadChange} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Content switcher ─────────────────────────────────────────────────────────

function NetworkContent({ tab }: { tab: Tab }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

  const get = useCallback(
    async (url: string, signal: AbortSignal) => {
      const token = await getToken();
      return api.get(url, { headers: { Authorization: `Bearer ${token}` }, signal });
    },
    [getToken]
  );

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      setLoading(false);
      setError("Please sign in to view your network.");
      setList([]);
      return;
    }

    // A fresh AbortController per tab/retry. If the tab changes (or the
    // component unmounts) before this request finishes, we cancel it — so a
    // slow response from a tab you've since navigated away from can never
    // land late and overwrite what's currently on screen, and can never
    // leave `loading` stuck true.
    const controller = new AbortController();
    const { signal } = controller;

    const load = async () => {
      setLoading(true);
      setError(null);
      setList([]);
      try {
        if (tab === "All") {
          const [f, fw] = await Promise.all([
            get(`${base}/api/friend/friends`, signal),
            get(`${base}/api/friend/request/send`, signal),
          ]);
          const friends = f.data.friends.map(({ friendshipId, user }) => ({
            ...user,
            friendshipId,
          }));
          const following = fw.data.following.map(({ friendshipId, user }) => ({
            ...user,
            friendshipId,
          }));
          setList([...friends, ...following]);
        } else if (tab === "Friends") {
          const res = await get(`${base}/api/friend/friends`, signal);
          setList(
            res.data.friends.map((friend) => ({
              ...friend.user,
              friendshipId: friend.friendshipId,
            }))
          );
        } else if (tab === "Following") {
          const res = await get(`${base}/api/friend/request/send`, signal);
          setList(
            res.data.following.map((following) => ({
              ...following.user,
              friendshipId: following.friendshipId,
            }))
          );
        } else if (tab === "Requests") {
          const res = await get(`${base}/api/friend/request`, signal);
          setList(res.data.following);
        }
      } catch (err: any) {
        if (axios.isCancel(err) || signal.aborted) return; // tab changed / unmounted — not a real error
        const timedOut = err?.code === "ECONNABORTED";
        const message = timedOut
          ? "This is taking too long — the server may be waking up. Try again."
          : err?.response?.data?.message ?? err?.message ?? "Something went wrong";
        setError(message);
        toast.error(message);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [tab, base, get, reloadKey, isLoaded, isSignedIn]);

  const remove = (id: string) =>
    setList((prev) => prev.filter((item) => (item._id ?? item.clerkId) !== id));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-600">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-600">
        <p className="text-sm text-center px-8">{error}</p>
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 text-xs font-medium hover:border-indigo-500/50 hover:text-indigo-400 transition-colors"
        >
          <RefreshCw size={12} />
          Try again
        </button>
      </div>
    );
  }

  if (list.length === 0) {
    const empty: Record<Tab, string> = {
      All:       "No connections yet.",
      Friends:   "No friends yet.",
      Following: "You're not following anyone.",
      Requests:  "No pending requests.",
    };
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-600">
        <Users size={28} strokeWidth={1.5} />
        <p className="text-sm">{empty[tab]}</p>
      </div>
    );
  }

  if (tab === "Requests") {
    return (
      <ul className="divide-y divide-zinc-800/60">
        {list.map((person: Request) => (
          <RequestRow key={person._id} person={person} onDone={() => remove(person._id ?? person.clerkId)} />
        ))}
      </ul>
    );
  }

  return (
    <ul className="divide-y divide-zinc-800/60">
      {list.map((item: Friend, i) => {
        const person: Friend["user"] = item.user ?? (item as unknown as Friend["user"]);
        return (
          <PersonRow
            key={item._id ?? i}
            person={person}
            mode={tab === "Following" ? "following" : "friend"}
            onDone={() => remove(item._id ?? person.clerkId)}
          />
        );
      })}
    </ul>
  );
}

function PersonRow({
  person,
  mode,
  onDone,
}: {
  person: Friend["user"];
  mode: "friend" | "following";
  onDone: () => void;
}) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

  const openChat = async () => {
    const friendId = person?._id ? String(person._id) : person?.clerkId ? String(person.clerkId) : "";
    if (!friendId) {
      toast.error("Cannot open chat — missing user id");
      return;
    }
    if (!base) {
      toast.error("Backend URL is not configured");
      return;
    }

    setBusy(true);
    try {
      const token = await getToken();
      if (!token) {
        toast.error("Please sign in again");
        return;
      }

      const res = await api.post(
        `${base}/api/chat/open`,
        { friendId },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20000,
        }
      );

      const conversationId = res.data?.conversationId;
      if (!conversationId) {
        throw new Error(res.data?.message ?? "Conversation not created");
      }

      router.push(`/chat/${conversationId}`);
    } catch (err: any) {
      const timedOut = err?.code === "ECONNABORTED";
      const status = err?.response?.status;
      const message = timedOut
        ? "That took too long — is the backend running?"
        : err?.response?.data?.message ??
          (status === 404 ? "Friend not found" : err?.message) ??
          "Failed to open chat";
      console.error("[Network] openChat failed:", status, err?.response?.data ?? err);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const action = async () => {
    setBusy(true);
    try {
      const token = await getToken();
      const url =
        mode === "friend"
          ? `${base}/api/friend/deletefriend/${person.friendshipId}`
          : `${base}/api/friend/requests/${person.friendshipId}`;
      await api.delete(url, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(mode === "friend" ? "Friend removed" : "Request cancelled");
      onDone();
    } catch (err: any) {
      const timedOut = err?.code === "ECONNABORTED";
      toast.error(timedOut ? "That took too long — please try again." : err?.message ?? "Action failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-800/40 group transition-colors">
      <img
        src={person.imageUrl}
        alt={`${person.firstName} ${person.lastName}`}
        className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-zinc-700"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200 truncate">
          {person.firstName} {person.lastName}
        </p>
      </div>

      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {mode === "friend" && (
          <ActionButton
            icon={<MessageCircle size={14} />}
            label="Message"
            onClick={openChat}
          />
        )}
        <ActionButton
          icon={busy ? <Loader2 size={14} className="animate-spin" /> : mode === "friend" ? <HeartCrack size={14} /> : <X size={14} />}
          label={mode === "friend" ? "Unfriend" : "Cancel request"}
          onClick={action}
          danger
        />
      </div>
    </li>
  );
}
// ─── Request row ──────────────────────────────────────────────────────────────
function RequestRow({
  person,
  onDone,
}: {
  person: Request;
  onDone: () => void;
}) {
  const { getToken } = useAuth();
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
  const respond = async (action: "accept" | "reject") => {
    setBusy(action);
    try {
      const token = await getToken();
      const url = `${base}/api/friend/requests/${person.friendshipId}`;
      if (action === "accept") {
        await api.patch(url, { friendshipId: person.friendshipId }, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("Friend added");
      } else {
        await api.delete(url, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("Request declined");
      }
      onDone();
    } catch (err: any) {
      const timedOut = err?.code === "ECONNABORTED";
      toast.error(timedOut ? "That took too long — please try again." : err?.message ?? "Action failed");
    } finally {
      setBusy(null);
    }
  };
  return (
    <li className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-800/40 group transition-colors">
      <img
        src={person.imageUrl}
        alt={`${person.firstName} ${person.lastName}`}
        className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-zinc-700"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200 truncate">
          {person.firstName} {person.lastName}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">Sent you a friend request</p>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Accept */}
        <button
          onClick={() => respond("accept")}
          disabled={!!busy}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
        >
          {busy === "accept"
            ? <Loader2 size={12} className="animate-spin" />
            : <UserCheck size={12} />}
          Accept
        </button>
        {/* Reject */}
        <button
          onClick={() => respond("reject")}
          disabled={!!busy}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700 transition-colors disabled:opacity-50"
        >
          {busy === "reject"
            ? <Loader2 size={12} className="animate-spin" />
            : <UserX size={12} />}
          Decline
        </button>
      </div>
    </li>
  );
}
// ─── Shared action button ─────────────────────────────────────────────────────
function ActionButton({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors ${
        danger
          ? "border-zinc-700 text-zinc-500 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10"
          : "border-zinc-700 text-zinc-500 hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/10"
      }`}
    >
      {icon}
    </button>
  );
}

function ChatContent({ onUnreadChange }: { onUnreadChange?: (count: number) => void }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [list, setList] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

  const loadChats = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const res = await api.get(`${base}/api/chat`, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
        const rows: ConversationRow[] = Array.isArray(res.data)
          ? res.data
          : res.data?.conversations ?? [];
        setList(rows);
        const total = rows.reduce((sum, row) => sum + (row.unreadCount || 0), 0);
        onUnreadChange?.(total);
      } catch (err: any) {
        if (axios.isCancel(err) || signal.aborted) return;
        const timedOut = err?.code === "ECONNABORTED";
        const message = timedOut
          ? "This is taking too long — the server may be waking up. Try again."
          : err?.response?.data?.message ?? err?.message ?? "Something went wrong";
        setError(message);
        toast.error(message);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [base, getToken, onUnreadChange]
  );

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      setLoading(false);
      setError("Please sign in to view your chats.");
      setList([]);
      return;
    }

    const controller = new AbortController();
    loadChats(controller.signal);
    return () => controller.abort();
  }, [loadChats, reloadKey, isLoaded, isSignedIn]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-600">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-600">
        <p className="text-sm text-center px-8">{error}</p>
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 text-xs font-medium hover:border-indigo-500/50 hover:text-indigo-400 transition-colors"
        >
          <RefreshCw size={12} />
          Try again
        </button>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-600">
        <MessageCircle size={28} strokeWidth={1.5} />
        <p className="text-sm">No conversations yet.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-800/60">
      {list.map((conversation) => {
        const person = conversation.user;

        return (
          <li
            key={conversation.conversationId}
            className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-800/40 group transition-colors cursor-pointer"
            onClick={() => router.push(`/chat/${conversation.conversationId}`)}
          >
            <img
              src={person?.imageUrl}
              alt={person?.firstName ?? "Conversation"}
              className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-zinc-700"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-zinc-200 truncate">
                  {person?.firstName ?? "Unknown"}
                </p>
                <span className="text-[11px] text-zinc-500 shrink-0">
                  {conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleDateString() : ""}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 truncate">
                {conversation.lastMessage || "Start a conversation"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {conversation.unreadCount > 0 && (
                <span className="min-w-5 h-5 px-1 rounded-full bg-indigo-600 text-white text-[11px] font-semibold flex items-center justify-center">
                  {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                </span>
              )}
              <span className="text-[11px] text-zinc-500">
                {conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}