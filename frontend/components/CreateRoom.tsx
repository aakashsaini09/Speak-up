import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from './ui/button';
import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { getToken } from "@clerk/nextjs";
import { Mic, Users } from "lucide-react";

const LANGUAGES = [
    "English", "Hindi", "Japanese", "Tamil", "Telugu",
    "Marathi", "Chinese", "Korean", "French", "Italian",
];

interface RoomData {
    title: string;
    language: string;
    maxUser: number;
}

interface Props {
    popup: boolean;
    setPopup: (open: boolean) => void;
    refetchRooms: () => void;
}

export default function CreateRoomPopup({ popup, setPopup, refetchRooms }: Props) {
    const [roomData, setRoomData] = useState<RoomData>({
        title: "",
        language: "English",
        maxUser: 3,
    });
    const [loading, setLoading] = useState(false);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

    const createRoom = async () => {
        if (roomData.title.trim().length <= 5) {
            toast.error("Title must be longer than 5 characters");
            return;
        }
        setLoading(true);
        try {
            const token = await getToken();
            const res = await axios.post(
                `${backendUrl}/api/room/create`,
                roomData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data?.success) {
                toast.success("Room created!");
                // fetchRoomFunction(backendUrl, () => {});
                refetchRooms()
                setPopup(false);
                // Reset form
                setRoomData({ title: "", language: "English", maxUser: 3 });
            } else {
                toast.error("Something went wrong");
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || "Request failed");
            } else {
                toast.error("Unknown error");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={popup} onOpenChange={setPopup}>
            <DialogContent className="sm:max-w-md pb-5 bg-transparent border border-zinc-800 text-white p-0 gap-0 overflow-hidden">

                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-zinc-800/80">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-violet-950/60 border border-violet-800/40 flex items-center justify-center">
                            <Mic size={16} className="text-violet-400" />
                        </div>
                        <DialogTitle className="text-white text-lg font-bold">Create a Room</DialogTitle>
                    </div>
                    <DialogDescription className="text-zinc-500 text-sm leading-relaxed">
                        Give your room a clear title so others know what language and level to expect.
                    </DialogDescription>
                </DialogHeader>

                {/* Form */}
                <div className="px-6 py-5 flex flex-col gap-4">

                    {/* Title */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="title" className="text-sm font-medium text-zinc-300">
                            Room Title
                        </label>
                        <input
                            id="title"
                            value={roomData.title}
                            onChange={e => setRoomData(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="E.g. Talk about movies and Series"
                            maxLength={80}
                            className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-4 py-2.5 text-md text-white placeholder-zinc-500 placeholder:text-md outline-none focus:ring-2 focus:ring-violet-600/50 focus:border-transparent transition-all"
                        />
                        <span className="text-xs text-zinc-600 text-right">{roomData.title.length}/80</span>
                    </div>

                    {/* Language + Max users in a row */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Language */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-zinc-300">Language</label>
                            <Select
                                value={roomData.language}
                                onValueChange={value => setRoomData(prev => ({ ...prev, language: value }))}
                            >
                                <SelectTrigger className="bg-zinc-800/80 border-zinc-700/60 text-white rounded-xl h-10 text-sm focus:ring-violet-600/50">
                                    <SelectValue placeholder="Language" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                    <SelectGroup>
                                        {LANGUAGES.map(lang => (
                                            <SelectItem
                                                key={lang}
                                                value={lang}
                                                className="focus:bg-zinc-800 focus:text-white cursor-pointer"
                                            >
                                                {lang}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Max users */}
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="maxUser" className="text-sm font-medium text-zinc-300 flex items-center gap-1.5">
                                <Users size={13} className="text-zinc-500" />
                                Max Users
                            </label>
                            <input
                                id="maxUser"
                                type="number"
                                min={1}
                                max={6}
                                value={roomData.maxUser}
                                onChange={e => {
                                    const val = parseInt(e.target.value, 10);
                                    setRoomData(prev => ({
                                        ...prev,
                                        maxUser: isNaN(val) ? 3 : Math.min(6, Math.max(1, val)),
                                    }));
                                }}
                                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-violet-600/50 focus:border-transparent transition-all h-10"
                            />
                            <span className="text-xs text-zinc-300">1 – 6 people</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <DialogFooter className="px-6 py-4 border-t border-zinc-800/80 flex gap-2">
                    <DialogClose asChild>
                        <Button
                            variant="outline"
                            className="flex-1 py-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl cursor-pointer bg-transparent"
                        >
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        onClick={createRoom}
                        disabled={loading}
                        className="flex-1 bg-violet-600 hover:bg-violet-500 text-white rounded-xl py-4 cursor-pointer"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Creating…
                            </span> ) : 'Create Room'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}