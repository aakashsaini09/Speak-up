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
import { Mic, Users, X } from "lucide-react";
// import OpenAI from "openai";
const LANGUAGES = [
    "English", "Hindi", "Japanese", "Tamil", "Telugu",
    "Marathi", "Chinese", "Korean", "French", "Italian",
];
const LABELS = [
    "Software Development", "Travel & Culture", "Movies & TV", "Music & Arts", "Sports & Recreation",
    "Food & Cooking", "Technology", "Business & Entrepreneurship", "Education & Learning", "Health & Wellness"
];

interface RoomData {
    title: string;
    language: string;
    maxUser: number;
    label?: string;
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
        label: "Software Development",
        maxUser: 3
    });
    const [loading, setLoading] = useState(false);
    const [AiLoading, setAiLoading] = useState(false);
    // const client = new OpenAI({apiKey: process.env.NEXT_OPENAI_Key!});
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
                setRoomData({ title: "", language: "English", maxUser: 3, label: "Software Development" });
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
    const generateTitle = async () =>{
        // e.preventDefault()
        setAiLoading(true)
        try {
            const res = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input: `
           Generate ONE short and engaging room title for a language practice platform.
            Requirements:
            - 2 to 6 words only
            - Sound natural and inviting
            - Suitable for voice or text conversation
            - Related to learning, speaking, culture, travel, daily life, movies, powerfull quote or casual discussion
            - Do not use quotation marks
            - Do not use numbering
            - Do not add explanations
            - Return ONLY the title
            - Use emoji sometimes
            Examples:
            English Speaking Practice
            Talk About Travel and Advantures
            Movie, Series and Anime Lovers 
            Talk about AI and IT
            Learn Through Discussion` }),
            });
            const data = await res.json();
            setRoomData((pre) => ({
                ...pre,
                title: data.text
            }))
            setAiLoading(false)
        } catch (error) {
            console.log("Error while generating: ", error)
            toast.error("Something went wrong!")
            setAiLoading(false)
        }
    }
    return (
        <Dialog open={popup} onOpenChange={setPopup}>
    <DialogContent
        className="bg-zinc-950 text-white p-0 gap-0 border-zinc-800"
        showCloseButton={false}
    >
        {/* Drag handle — mobile only visual cue */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        {/* Header */}
        <DialogHeader className="px-5 pt-4 pb-4 sm:pt-6 sm:px-6 border-b border-zinc-800/80">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-transparent border border-violet-800/40 flex items-center justify-center shrink-0">
                        <Mic size={15} className="text-violet-400" />
                    </div>
                    <div>
                        <DialogTitle className="text-white text-base sm:text-lg font-bold">
                            Create a Room
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500 text-xs sm:text-sm mt-0.5">
                            Be respectful with the title
                        </DialogDescription>
                    </div>
                </div>
                {/* Close button — top right on desktop, hidden on mobile
                    (user swipes down or taps Cancel instead) */}
                <DialogClose asChild>
                    <button className="hidden sm:flex w-7 h-7 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
                        <X size={15} />
                    </button>
                </DialogClose>
            </div>
        </DialogHeader>

        {/* Form */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 flex flex-col gap-4">

            {/* Title */}
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                    <label htmlFor="title" className="text-sm font-medium text-zinc-300">
                        Room Title
                    </label>
                    <button
                        onClick={generateTitle}
                        disabled={AiLoading}
                        className={`flex items-center gap-1.5 text-xs transition-colors ${
                            AiLoading
                                ? "text-zinc-600 cursor-not-allowed"
                                : "text-violet-400 hover:text-violet-300 cursor-pointer"
                        }`}
                    >
                        {AiLoading ? (
                            <>
                                <span className="w-3 h-3 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
                                Generating…
                            </>
                        ) : (
                            <>🤖 Generate with AI</>
                        )}
                    </button>
                </div>
                <input
                    id="title"
                    value={roomData.title}
                    onChange={e => setRoomData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="E.g. Talk about movies and series"
                    maxLength={80}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:ring-2 focus:ring-violet-600/50 focus:border-transparent transition-all"
                />
                <span className="text-xs text-zinc-600 text-right">{roomData.title.length}/80</span>
            </div>

            {/* Language + Label — stacked on mobile, side by side on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Language */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-zinc-300">Language</label>
                    <Select
                        value={roomData.language}
                        onValueChange={value => setRoomData(prev => ({ ...prev, language: value }))}
                    >
                        <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white rounded-xl h-10 text-sm focus:ring-violet-600/50 w-full">
                            <SelectValue placeholder="Select language" />
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

                {/* Label */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-zinc-300">Topic</label>
                    <Select
                        value={roomData.label}
                        onValueChange={value => setRoomData(prev => ({ ...prev, label: value }))}
                    >
                        <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white rounded-xl h-10 text-sm focus:ring-violet-600/50 w-full">
                            <SelectValue placeholder="Select topic" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                            <SelectGroup>
                                {LABELS.map(label => (
                                    <SelectItem
                                        key={label}
                                        value={label}
                                        className="focus:bg-zinc-800 focus:text-white cursor-pointer"
                                    >
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Max users — full width on mobile, half on sm+ */}
            <div className="flex flex-col gap-1.5 sm:max-w-[calc(50%-6px)]">
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
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-violet-600/50 focus:border-transparent transition-all h-10"
                />
                <span className="text-xs text-zinc-600">1 – 6 people</span>
            </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 pt-3 sm:px-6 sm:pb-5 border-t border-zinc-800/80 flex gap-2.5">
            <DialogClose asChild>
                <Button
                    variant="outline"
                    className="flex-1 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-xl h-10 bg-transparent cursor-pointer"
                >
                    Cancel
                </Button>
            </DialogClose>
            <Button
                onClick={createRoom}
                disabled={loading}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-10 cursor-pointer"
            >
                {loading ? (
                    <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating…
                    </span>
                ) : "Create Room"}
            </Button>
        </div>
    </DialogContent>
</Dialog>
    );
}