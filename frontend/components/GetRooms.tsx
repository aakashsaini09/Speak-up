"use client"
import axios from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import RoomCard from './RoomCard';
import { Mic2, RefreshCw } from 'lucide-react';

// Exported so CreateRoom can trigger a refetch after creation
export const fetchRoomFunction = async (
    backendUrl: string,
    setRooms: React.Dispatch<React.SetStateAction<any[]>>,
    setLoading?: (v: boolean) => void
) => {
    setLoading?.(true);
    try {
        const res = await axios.get(`${backendUrl}/api/room`);
        if (res.data?.success) {
            setRooms(res.data.rooms);
        } else {
            toast.error("Something went wrong loading rooms");
        }
    } catch (error) {
        if (axios.isAxiosError(error)) {
            toast.error(error.response?.data?.message || "Failed to load rooms");
        } else {
            toast.error("Unknown error");
        }
    } finally {
        setLoading?.(false);
    }
};

export default function GetRooms({rooms, loading, refresh}) {
    // const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
    // const [rooms, setRooms] = useState<any[]>(initialRooms ?? []);
    // const [loading, setLoading] = useState(initialLoading ?? true);

    // const refresh = () => fetchRoomFunction(backendUrl, setRooms, setLoading);

    useEffect(() => { refresh(); }, []);

    // ── Loading skeleton ──────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="px-6 sm:px-10 lg:px-20 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="h-6 w-32 bg-zinc-800 rounded-lg animate-pulse" />
                    <div className="h-7 w-20 bg-zinc-800 rounded-full animate-pulse" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 h-64 animate-pulse">
                            <div className="flex gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-zinc-800" />
                                <div className="flex-1">
                                    <div className="h-3 w-16 bg-zinc-800 rounded mb-2" />
                                    <div className="h-4 w-36 bg-zinc-800 rounded" />
                                </div>
                            </div>
                            <div className="flex gap-3 justify-center mt-6">
                                {[...Array(3)].map((_, j) => (
                                    <div key={j} className="w-14 h-14 rounded-full bg-zinc-800" />
                                ))}
                            </div>
                            <div className="h-9 bg-zinc-800 rounded-xl mt-6" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ── Empty state ───────────────────────────────────────────────────────────
    if (rooms.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-6">
                <div className="group w-20 h-20 rounded-2xl bg-transparent border border-zinc-800 hover:border-zinc-600 flex items-center justify-center">
                    <Mic2 size={32} className="text-zinc-600 group-hover:text-zinc-400" />
                </div>
                <div>
                    <h2 className="text-white text-2xl font-bold mb-1.5">
                        No rooms yet
                    </h2>
                    <p className="text-zinc-500 text-sm max-w-md flex">
                        Be the first to create a room and invite others to practice.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
                        💡 Empty rooms are automatically removed after 2 minutes of inactivity.
                    </div>
                </div>
                <button
                    onClick={refresh}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-zinc-700 text-zinc-400 hover:text-white hover:border-blue-800 text-sm font-medium transition-all cursor-pointer"
                >
                    <RefreshCw size={14} />
                    Check again
                </button>
            </div>
        );
    }

    // ── Room grid ─────────────────────────────────────────────────────────────
    return (
        <div className="px-6 sm:px-10 lg:px-20 py-8">
            <div className="flex items-center justify-between mb-6 md:px-20">
                <div>
                    <h2 className="text-white font-bold text-xl">Live Rooms</h2>
                    <p className="text-zinc-500 text-sm mt-0.5">
                        {rooms.length} room{rooms.length !== 1 ? 's' : ''} available
                    </p>
                </div>
                <button
                    onClick={refresh}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 text-xs font-medium transition-all cursor-pointer"
                >
                    <RefreshCw size={12} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:px-2 md:px-20">
                {rooms.slice(0).reverse().map((room, idx) => (
                    <RoomCard key={room._id ?? idx} room={room} />
                ))}
            </div>
        </div>
    );
}