"use client"
import axios from 'axios';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';
import RoomCard from './RoomCard';
import { Mic2, RefreshCw } from 'lucide-react';
import { FilterStrip } from './FilterStrip';

type Room = {
    _id: string;
    title: string;
    label?: string;
    language: string;
    activeParticipants: number;
    maxUser: number;
    creatorImg: string;
    participantsList: { id: string; image: string }[];
    [key: string]: unknown;
};

type GetRoomsProps = {
    rooms: Room[];
    loading: boolean;
    refresh: () => void;
};

export const fetchRoomFunction = async (
    backendUrl: string,
    setRooms: Dispatch<SetStateAction<Room[]>>,
    setLoading?: (v: boolean) => void
) => {
    setLoading?.(true);
    try {
        const res = await axios.get(`${backendUrl}/api/room`);
        if (res.data?.success) {
            setRooms(res.data.rooms);
            console.log("Rooms fetched successfully:", res.data.rooms);
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

export default function GetRooms({ rooms, loading, refresh }: GetRoomsProps) {
    const LABELS = [ "All", "Software Development", "Travel & Culture", "Movies & TV", "Music & Arts", "Sports & Recreation", "Food & Cooking", "Technology", "Business & Entrepreneurship", "Education & Learning", "Health & Wellness"];
    const LANGUAGES = ["All", "English", "Hindi", "Japanese", "Tamil", "Telugu", "Marathi", "Chinese", "Korean", "French", "Italian",];

    useEffect(() => { refresh(); }, []);
    const [activeLabel, setActiveLabel] = useState("All");
    const [activeLanguage, setActiveLanguage] = useState("All");

    const filtersActive = activeLabel !== "All" || activeLanguage !== "All";

    const clearFilters = () => {
        setActiveLabel("All");
        setActiveLanguage("All");
    };

    const filteredRooms = rooms.filter((room) => {
        const matchesLabel = activeLabel === "All" || room.label === activeLabel;
        const matchesLanguage =
            activeLanguage === "All" || room.language === activeLanguage;

        return matchesLabel && matchesLanguage;
    });

    return (
        <div className="px-6 sm:px-10 lg:px-20 py-8">
            {/* Filters stay mounted for empty + loading states so users can always switch back */}
            <div className="sticky top-0 z-20 -mx-6 sm:-mx-10 lg:-mx-20 px-6 sm:px-10 lg:px-20 pt-1 pb-2 mb-2 bg-zinc-950/95 backdrop-blur-sm">
                <FilterStrip
                    label="Topic"
                    items={LABELS}
                    active={activeLabel}
                    onChange={setActiveLabel}
                />
                <FilterStrip
                    label="Language"
                    items={LANGUAGES}
                    active={activeLanguage}
                    onChange={setActiveLanguage}
                />
            </div>

            <div className="flex items-center justify-between mb-6 md:px-20">
                <div>
                    <h2 className="text-white font-bold text-xl">Live Rooms</h2>
                    <p className="text-zinc-500 text-sm mt-0.5">
                        {loading
                            ? "Loading rooms…"
                            : `${filteredRooms.length} room${filteredRooms.length !== 1 ? "s" : ""} available`}
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

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:px-2 md:px-20">
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
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:px-2 md:px-20">
                    {filteredRooms.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 gap-5 text-center px-6">
                            <div className="group w-20 h-20 rounded-2xl bg-transparent border border-zinc-800 hover:border-zinc-600 flex items-center justify-center">
                                <Mic2 size={32} className="text-zinc-600 group-hover:text-zinc-400" />
                            </div>
                            <div>
                                <h2 className="text-white text-2xl font-bold mb-1.5">
                                    {filtersActive
                                        ? "No rooms match this filter"
                                        : "No live rooms yet"}
                                </h2>
                                <p className="text-zinc-500 text-sm max-w-md mx-auto">
                                    {filtersActive
                                        ? "Pick another topic/language above, or clear filters to see every room."
                                        : "Create a room or check again in a moment."}
                                </p>
                                <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
                                    Empty rooms are automatically removed after 2 minutes of inactivity.
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                {filtersActive && (
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-zinc-600 text-zinc-200 hover:text-white hover:border-zinc-400 text-sm font-medium transition-all cursor-pointer"
                                    >
                                        Show all rooms
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={refresh}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-sm font-medium transition-all cursor-pointer"
                                >
                                    <RefreshCw size={14} />
                                    Check again
                                </button>
                            </div>
                        </div>
                    ) : (
                        filteredRooms.slice(0).reverse().map((room, idx) => (
                            <RoomCard key={room._id ?? idx} room={room} />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}