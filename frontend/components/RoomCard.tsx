"use client"
import { useRouter } from "next/navigation";
import { Users, Mic, Phone } from 'lucide-react';
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

type Room = {
    _id: string;
    title: string;
    language: string;
    activeParticipants: number;
    maxUser: number;
    creatorImg: string;
    participantsList: { id: string; image: string; }[];
};

// Unique but deterministic placeholder per slot
const placeholder = (seed: string) =>
    `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}`;

// Map language names to flag/emoji for a bit of personality
const LANG_FLAGS: Record<string, string> = {
    English: "🇬🇧", Hindi: "🇮🇳", Japanese: "🇯🇵", Tamil: "🇮🇳",
    Telugu: "🇮🇳", Marathi: "🇮🇳", Chinese: "🇨🇳", Korean: "🇰🇷",
    French: "🇫🇷", Italian: "🇮🇹",
};

export default function RoomCard({ room }: { room: Room }) {
    const { user } = useUser();
    const router = useRouter();

    const isFull = room.activeParticipants >= room.maxUser;

    const joinRoom = () => {
        if (!user?.id) {
            toast.error("Please sign in to join a room");
            return;
        }
        if (isFull) {
            toast.error("This room is full");
            return;
        }
        router.push(`/room/${room._id}`);
    };

    // Decide circle size based on how many slots to display
    const circleClass = room.maxUser > 4
        ? "w-12 h-12"   // small — 5–6 slots
        : room.maxUser > 3
        ? "w-14 h-14"   // medium — 4 slots
        : "w-16 h-16";  // large  — 1–3 slots

    return (
        <div className="group flex flex-col gap-4 w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-violet-800/50 hover:shadow-lg hover:shadow-violet-950/20 transition-all duration-200">

            {/* ── Header ────────────────────────────────────────────────────── */}
            <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                    {/* Language badge */}
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full bg-violet-950/60 text-violet-300 border border-violet-800/40 mb-2">
                        <span>{LANG_FLAGS[room.language] ?? "🌐"}</span>
                        {room.language}
                    </span>

                    {/* Room title */}
                    <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2">
                        {room.title}
                    </h3>
                </div>

                {/* Creator avatar */}
                <img
                    src={room.creatorImg || placeholder('creator')}
                    alt="Room creator"
                    className="w-10 h-10 rounded-full object-cover border-2 border-zinc-700 shrink-0"
                />
            </div>

            {/* ── Participant slots ─────────────────────────────────────────── */}
            <div className="flex-1">
                {/* Capacity label */}
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

                {/* Avatar grid — always 3 columns, 2 rows for 4-6 slots */}
                <div className={`grid grid-cols-3 gap-2 ${room.maxUser > 3 ? '' : 'justify-items-center'}`}>
                    {Array.from({ length: room.maxUser }, (_, i) => {
                        const isOccupied = i < room.activeParticipants;
                        // Use real image if available, otherwise use deterministic placeholder
                        const participantImg =
                            room.participantsList?.[i]?.image || placeholder(`user-${room._id}-${i}`);

                        return (
                            <div key={i} className="flex justify-center">
                                {isOccupied ? (
                                    /* Filled slot */
                                    <div className="relative">
                                        <img
                                            src={participantImg}
                                            alt={`Participant ${i + 1}`}
                                            className={`${circleClass} rounded-full object-cover border-2 border-violet-700/50`}
                                        />
                                        {/* Online indicator */}
                                        <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-400 rounded-full border-2 border-zinc-900" />
                                    </div>
                                ) : (
                                    /* Empty slot */
                                    <div className={`${circleClass} rounded-full border-2 border-dashed border-zinc-700/70 flex items-center justify-center group-hover:border-zinc-600 transition-colors`}>
                                        <Mic size={circleClass.includes('16') ? 16 : 13} className="text-zinc-700" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Join button ───────────────────────────────────────────────── */}
            <button
                onClick={joinRoom}
                disabled={isFull}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isFull
                        ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                        : 'bg-violet-600 hover:bg-violet-500 text-white cursor-pointer shadow-md shadow-violet-600/20'
                }`}
            >
                {isFull ? 'Room Full' : `Join Room`}
            </button>
        </div>
    );
}