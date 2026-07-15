"use client";

import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@clerk/nextjs";
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
}
export default function Network({ popup, setPopup, refetchRooms }: Props) {
  const [tab, setTab] = useState<Tab>("All");

  return (
    <Dialog open={popup} onOpenChange={setPopup}>
  <DialogContent className="sm:max-w-md md:max-w-2xl h-[80vh] bg-zinc-900 border border-zinc-800 rounded-2xl p-0 overflow-hidden flex flex-col gap-0">
    {/* Header */}
    <div className="h-14 flex items-center justify-between px-5 border-b border-zinc-800 shrink-0">
      <h2 className="text-sm font-semibold text-zinc-100 tracking-wide">
        Network
      </h2>
    </div>

    {/* Tabs */}
    <div className="h-12 flex items-center border-b border-zinc-800 px-2 shrink-0">
  {TABS.map((t) => (
    <button
      key={t}
      onClick={() => setTab(t)}
      className={`h-full flex items-center gap-1.5 px-3 text-xs font-medium transition-colors relative ${
        tab === t
          ? "text-zinc-100"
          : "text-zinc-500 hover:text-zinc-300"
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

    {/* Content */}
    <div className="flex-1 overflow-y-auto">
      <NetworkContent tab={tab} />
    </div>
  </DialogContent>
</Dialog>
  );
}

// ─── Content switcher ─────────────────────────────────────────────────────────

function NetworkContent({ tab }: { tab: Tab }) {
  const { getToken } = useAuth();
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
  }, [tab, base, get, reloadKey]);

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
  const [busy, setBusy] = useState(false);
  const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

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
            onClick={() => toast.info("Chat coming soon")}
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