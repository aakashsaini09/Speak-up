"use client"
import { useRouter } from "next/navigation";
import {User} from 'lucide-react'
type RoomProps = {
    room: {
        _id: string;
        title: string;
        language: string;
        creatorImg: string;
        activeParticipants: {
            id: string;
            image: string;
        }[];
    };
};
export default function RoomCard({ room }: RoomProps) {
    const router = useRouter()
    const joinRoom = (roomId: string) =>{
        console.log(roomId)
    }
    const participants = room.activeParticipants || [];

    const avatarSize =
        participants.length > 3
            ? "w-8 h-8"
            : "w-10 h-10";

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between h-80 shadow-md hover:border-zinc-700 transition-all">

            {/* Header */}
            <div className="flex gap-3">
                <img
                      src={room.creatorImg}
                    // src="https://imgs.search.brave.com/8P4tCTzlcakw8czgBE6L1J6BvWGO3VRhLV9apmAYxQc/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pbWFn/ZXMudW5zcGxhc2gu/Y29tL3Bob3RvLTE0/OTYzNDU4NzU2NTkt/MTFmN2RkMjgyZDFk/P2ZtPWpwZyZxPTYw/Jnc9MzAwMCZhdXRv/PWZvcm1hdCZmaXQ9/Y3JvcCZpeGxpYj1y/Yi00LjEuMCZpeGlk/PU0zd3hNakEzZkRC/OE1IeHpaV0Z5WTJo/OE4zeDhiV1Z1ZkdW/dWZEQjhmREI4Zkh3/dw"
                    alt="creator"
                    className="w-12 h-12 rounded-full object-cover border border-zinc-700"
                />

                <div className="min-w-0">
                    <h3 className="text-white font-semibold text-xl truncate">
                        {room.title}
                    </h3>

                    <p className="text-sm text-blue-400 flex justify-between">
                        <span>{room.language}</span> <span className="flex justify-center items-center text-xl"><User size={20}/> 0</span>
                    </p>
                </div>
            </div>

            {/* Participants Section */}
            <div className="h-22.5 flex items-center justify-center">

                {participants.length === 0 ? (
                    <div className="flex gap-3">
                    <div className="h-28 border-2 rounded-full w-28 border-dashed"></div>
                    <div className="h-28 border-2 rounded-full w-28 border-dashed"></div>
                    <div className="h-28 border-2 rounded-full w-28 border-dashed"></div>
                    </div>
                ) : (
                    <div
                        className={`grid ${participants.length > 3
                                ? "grid-cols-3 gap-2"
                                : "grid-cols-3 gap-3"
                            }`}
                    >
                        {participants.map((participant) => (
                            <img
                                key={participant.id}
                                // src={participant.image}
                                src="https://imgs.search.brave.com/8P4tCTzlcakw8czgBE6L1J6BvWGO3VRhLV9apmAYxQc/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pbWFn/ZXMudW5zcGxhc2gu/Y29tL3Bob3RvLTE0/OTYzNDU4NzU2NTkt/MTFmN2RkMjgyZDFk/P2ZtPWpwZyZxPTYw/Jnc9MzAwMCZhdXRv/PWZvcm1hdCZmaXQ9/Y3JvcCZpeGxpYj1y/Yi00LjEuMCZpeGlk/PU0zd3hNakEzZkRC/OE1IeHpaV0Z5WTJo/OE4zeDhiV1Z1ZkdW/dWZEQjhmREI4Zkh3/dw"
                                alt=""
                                className={`${avatarSize} rounded-full object-cover border border-zinc-700`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex justify-center">
                <button onClick={() => router.push(`/room/${room._id}`)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg transition cursor-pointer">
                    Join Room
                </button>
            </div>
        </div>
    );
}