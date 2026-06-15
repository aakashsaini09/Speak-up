"use client"
import { useRouter } from "next/navigation";
import {User} from 'lucide-react'
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
type RoomProps = {
    room: {
        _id: string;
        title: string;
        language: string;
        activeParticipants: number;
        maxUser: number;
        creatorImg: string;
        participantsList: {
            id: string;
            image: string;
        }[];
    };
};
export default function RoomCard({ room }: RoomProps) {
    const { user } = useUser()
    const router = useRouter()
    const goToRoom = (id: string) => {
           if (!id || !user?.id) {
            // router.push('/')
            toast.error("Please login first")
            return;
        };
        router.push(`/room/${id}`)
    }
    const participants = room.participantsList || [];
    const avatarSize =
        room.maxUser > 3
            ? "w-22 h-22"
            : "w-28 h-28";

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between h-80 shadow-md hover:border-zinc-700 transition-all">

            {/* Header */}
            <div className="flex gap-3">
                <img
                    src={room.creatorImg ? room.creatorImg : 'https://imgs.search.brave.com/GwKK4NwXL6KxFDH7Ivikaj9TnRuJOx8urkkQDTnL48U/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pbWcu/bWFnbmlmaWMuY29t/L3ByZW1pdW0tcGhv/dG8vYWRvcmFibGUt/Y2FydG9vbi1naXJs/LXdpdGgtYnVuLWhh/aXJzdHlsZS1yZWQt/c2NhcmYtZmFsbC1m/b2xpYWdlLWJhY2tn/cm91bmQtcGVyZmVj/dF85MTE4NDktNjA0/MzE1LmpwZz9zZW10/PWFpc19oeWJyaWQm/dz03NDAmcT04MA'}
                    // src="https://imgs.search.brave.com/8P4tCTzlcakw8czgBE6L1J6BvWGO3VRhLV9apmAYxQc/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pbWFn/ZXMudW5zcGxhc2gu/Y29tL3Bob3RvLTE0/OTYzNDU4NzU2NTkt/MTFmN2RkMjgyZDFk/P2ZtPWpwZyZxPTYw/Jnc9MzAwMCZhdXRv/PWZvcm1hdCZmaXQ9/Y3JvcCZpeGxpYj1y/Yi00LjEuMCZpeGlk/PU0zd3hNakEzZkRC/OE1IeHpaV0Z5WTJo/OE4zeDhiV1Z1ZkdW/dWZEQjhmREI4Zkh3/dw"}
                    alt="creator"
                    className="w-12 h-12 rounded-full object-cover border border-zinc-700"
                />

                <div className="min-w-0">
                    <h3 className="text-white font-semibold text-xl truncate">
                        {room.title}
                    </h3>

                    <p className="text-sm text-blue-400 flex justify-between">
                        <span>{room.language}</span> <span className="flex justify-center items-center text-xl"><User size={20}/> {room.activeParticipants}/{room.maxUser}</span>
                    </p>
                </div>
            </div>

            {/* Participants Section */}
            <div className="h-22.5 flex items-center justify-center">

                {room.maxUser === 0 ? (
                    <div className="flex gap-3">
                    <div className="h-28 border-2 rounded-full w-28 border-dashed"></div>
                    <div className="h-28 border-2 rounded-full w-28 border-dashed"></div>
                    <div className="h-28 border-2 rounded-full w-28 border-dashed"></div>
                    </div>
                ) : (
                <div className={`grid ${room.maxUser > 3 ? "grid-cols-3 gap-2" : "grid-cols-3 gap-3" }`} >
                    {Array.from({ length: room.maxUser }, (_, i) => (
                        <div key={i}>
                            <div className={`${avatarSize} border-2 rounded-full border-dashed ${i < room.activeParticipants ? 'bg-' : ''}`}>
                                {i < room.activeParticipants ? (
                                    <img src="https://imgs.search.brave.com/8P4tCTzlcakw8czgBE6L1J6BvWGO3VRhLV9apmAYxQc/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pbWFn/ZXMudW5zcGxhc2gu/Y29tL3Bob3RvLTE0/OTYzNDU4NzU2NTkt/MTFmN2RkMjgyZDFk/P2ZtPWpwZyZxPTYw/Jnc9MzAwMCZhdXRv/PWZvcm1hdCZmaXQ9/Y3JvcCZpeGxpYj1y/Yi00LjEuMCZpeGlk/PU0zd3hNakEzZkRC/OE1IeHpaV0Z5WTJo/OE4zeDhiV1Z1ZkdW/dWZEQjhmREI4Zkh3/dw"
                                alt="" className={`${avatarSize} rounded-full object-cover border border-zinc-700`} />
                                ) : (<></>)}
                            </div>
                        </div>
                    ))}
                {/* {participants.map((participant) => (
                <img
                key={participant.id}
                // src={participant.image}
                src="https://imgs.search.brave.com/8P4tCTzlcakw8czgBE6L1J6BvWGO3VRhLV9apmAYxQc/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pbWFn/ZXMudW5zcGxhc2gu/Y29tL3Bob3RvLTE0/OTYzNDU4NzU2NTkt/MTFmN2RkMjgyZDFk/P2ZtPWpwZyZxPTYw/Jnc9MzAwMCZhdXRv/PWZvcm1hdCZmaXQ9/Y3JvcCZpeGxpYj1y/Yi00LjEuMCZpeGlk/PU0zd3hNakEzZkRC/OE1IeHpaV0Z5WTJo/OE4zeDhiV1Z1ZkdW/dWZEQjhmREI4Zkh3/dw"
                alt=""
                className={`${avatarSize} rounded-full object-cover border border-zinc-700`}
                 />
                ))} */}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex justify-center">
                <button onClick={()=> goToRoom(room._id)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg transition cursor-pointer">
                    Join Room
                </button>
            </div>
        </div>
    );
}