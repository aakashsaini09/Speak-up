"use client"
import { useRouter } from "next/navigation";
import { Users, Mic } from 'lucide-react';
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

type Room = {
    _id: string;
    title: string;
    language: string;
    activeParticipants: number;
    maxUser: number;
    creatorImg: string;
    participantsList: { id: string; image: string }[];
};

const placeholder = (seed: string) =>
    `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}`;

const LANG_FLAGS: Record<string, string> = {
    English: "🇬🇧", Hindi: "🇮🇳", Japanese: "🇯🇵", Tamil: "🇮🇳",
    Telugu: "🇮🇳", Marathi: "🇮🇳", Chinese: "🇨🇳", Korean: "🇰🇷",
    French: "🇫🇷", Italian: "🇮🇹",
};

// ─── Slot layout config ────────────────────────────────────────────────────────
//
//  maxUser 1–3  → all slots shown, large circles (w-16 h-16), 3-col centered
//  maxUser 4–6  → all slots shown, medium circles (w-14 h-14), 3-col grid
//  maxUser 7–10 → first 5 slots + overflow badge, small circles (w-12 h-12)
//
// The overflow badge at position 6 shows "+N" where N = maxUser − 5 (the
// number of hidden slots). It does NOT replace an occupied slot — the first 5
// real slots are always rendered regardless of how many are occupied.

const MAX_VISIBLE_SLOTS = 6;   // how many circles the grid ever shows
const OVERFLOW_AFTER    = 5;   // real slots shown before the overflow badge

function getLayout(maxUser: number): {
    circleClass: string;
    cols: string;
    centered: boolean;
    showsOverflow: boolean;
    slotsToRender: number; // total grid cells to render (real + optional overflow)
    overflowCount: number; // how many slots are hidden
} {
    if (maxUser <= 3) {
        return {
            circleClass:  "w-16 h-16",
            cols:         "grid-cols-3",
            centered:     true,
            showsOverflow: false,
            slotsToRender: maxUser,
            overflowCount: 0,
        };
    }
    if (maxUser <= 6) {
        return {
            circleClass:  "w-14 h-14",
            cols:         "grid-cols-3",
            centered:     false,
            showsOverflow: false,
            slotsToRender: maxUser,
            overflowCount: 0,
        };
    }
    // 7–10
    return {
        circleClass:  "w-12 h-12",
        cols:         "grid-cols-3",
        centered:     false,
        showsOverflow: true,
        slotsToRender: MAX_VISIBLE_SLOTS,        // 5 real + 1 overflow badge
        overflowCount: maxUser - OVERFLOW_AFTER, // e.g. 10 − 5 = +5
    };
}

export default function RoomCard({ room }: { room: Room }) {
    const { user } = useUser();
    const router   = useRouter();

    const isFull = room.activeParticipants >= room.maxUser;

    const joinRoom = () => {
        if (!user?.id) { toast.error("Please sign in to join a room"); return; }
        if (isFull)    { toast.error("This room is full");              return; }
        router.push(`/room/${room._id}`);
    };

    const { circleClass, cols, centered, showsOverflow, slotsToRender, overflowCount } =
        getLayout(room.maxUser);

    // Infer mic icon size from circle dimension
    const micSize = circleClass.includes("16") ? 16 : 13;

    return (
        <div className="group flex flex-col gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-5
                        hover:border-violet-800/50 hover:shadow-lg hover:shadow-violet-950/20
                        transition-all duration-200">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold
                                     px-2 py-1 rounded-full mb-2
                                     bg-violet-950/60 text-violet-300 border border-violet-800/40">
                        <span>{LANG_FLAGS[room.language] ?? "🌐"}</span>
                        {room.language}
                    </span>
                    <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2">
                        {room.title}
                    </h3>
                </div>
                <img
                    src={room.creatorImg || placeholder("creator")}
                    alt="Room creator"
                    className="w-10 h-10 rounded-full object-cover border-2 border-zinc-700 shrink-0"
                />
            </div>

            {/* ── Participant slots ────────────────────────────────────────── */}
            <div className="flex-1">
                {/* Capacity row */}
                <div className="flex items-center gap-1.5 mb-3">
                    <Users size={12} className="text-zinc-600" />
                    <span className="text-xs text-zinc-500">
                        {room.activeParticipants} / {room.maxUser} joined
                    </span>
                    {isFull ? (
                        <span className="ml-auto text-xs text-red-400 font-medium">Full</span>
                    ) : (
                        <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                            Open
                        </span>
                    )}
                </div>

                {/* Slot grid */}
                <div className={`grid ${cols} gap-2 ${centered ? "justify-items-center" : ""}`}>
                    {Array.from({ length: slotsToRender }, (_, i) => {
                        // Last cell becomes the overflow badge for large rooms
                        const isOverflowCell = showsOverflow && i === slotsToRender - 1;

                        if (isOverflowCell) {
                            return (
                                <OverflowBadge
                                    key="overflow"
                                    circleClass={circleClass}
                                    count={overflowCount}
                                />
                            );
                        }

                        const isOccupied = i < room.activeParticipants;
                        const img =
                            room.participantsList?.[i]?.image ||
                            placeholder(`user-${room._id}-${i}`);

                        return (
                            <div key={i} className="flex justify-center">
                                {isOccupied ? (
                                    <FilledSlot circleClass={circleClass} img={img} index={i} />
                                ) : (
                                    <EmptySlot
                                        circleClass={circleClass}
                                        micSize={micSize}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Join button ──────────────────────────────────────────────── */}
            <button
                onClick={joinRoom}
                disabled={isFull}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isFull
                        ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                        : "bg-violet-600 hover:bg-violet-500 text-white cursor-pointer shadow-md shadow-violet-600/20"
                }`}
            >
                {isFull ? "Room Full" : "Join Room"}
            </button>
        </div>
    );
}

// ─── Slot sub-components ───────────────────────────────────────────────────────

function FilledSlot({ circleClass, img, index }: {
    circleClass: string;
    img: string;
    index: number;
}) {
    return (
        <div className="relative flex justify-center">
            <img
                src={img}
                alt={`Participant ${index + 1}`}
                className={`${circleClass} rounded-full object-cover border-2 border-violet-700/50`}
            />
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-zinc-900" />
        </div>
    );
}

function EmptySlot({ circleClass, micSize }: { circleClass: string; micSize: number }) {
    return (
        <div className={`${circleClass} rounded-full border-2 border-dashed border-zinc-700/70
                         flex items-center justify-center
                         group-hover:border-zinc-600 transition-colors`}>
            <Mic size={micSize} className="text-zinc-700" />
        </div>
    );
}

/**
 * Overflow badge — the 6th circle in large rooms.
 *
 * Shows "+N" where N = total hidden slots (maxUser − 5).
 * Dimmed styling makes it clear it's metadata, not a real participant slot.
 */
function OverflowBadge({ circleClass, count }: { circleClass: string; count: number }) {
    return (
        <div className="flex justify-center">
            <div className={`${circleClass} rounded-full border-2 border-zinc-700/50 bg-zinc-800/80
                             flex flex-col items-center justify-center gap-0.5`}>
                <span className="text-zinc-300 font-bold leading-none"
                      style={{ fontSize: circleClass.includes("12") ? "13px" : "15px" }}>
                    +{count}
                </span>
                <span className="text-zinc-600 leading-none"
                      style={{ fontSize: "9px" }}>
                    more
                </span>
            </div>
        </div>
    );
}