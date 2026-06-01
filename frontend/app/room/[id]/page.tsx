"use client";

import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import ChatPanel from "@/components/ChatPanel";
type Participant = {
  userId: string;
  name: string;
  imageUrl: string;
};

type ParticipantProps = {
  participant: Participant;
};
export default function Page() {
    const {user} = useUser();
    const { id } = useParams();
    // console.log("Id: ", id)
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [userCount, setUserCount] = useState(0);
    useEffect(() => {
      console.log(
        "Updated participants:",
        participants
      );
    }, [participants]);

  useEffect(() => {
      if (!id || !user?.id) return;
    const userAndRoomData = {
      roomId: id,
      userId: user?.id,
      name: user?.firstName,
      imageUrl: user?.imageUrl
    };
    socket.on("participants-count", (count) => {
      console.log("Number of participats: ", count);
      setUserCount(count)
    });
    socket.on("participants-update", (data) => {
      // console.log("Data: ", data)
      setParticipants(data)
    } )
    // console.log("participants: ", participants)
    socket.on("room-message", (message) => {
      console.log(message);
    });
    socket.emit("join-room", userAndRoomData);
    return () => {
      socket.off("room-message");
      socket.off("participants-count");
      socket.off("participants-update");
    };
  }, [id, user?.id]);

  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);

  return (
    <div className="h-screen bg-zinc-950 text-white flex">
      {/* Main Section */}
      <div className="flex-1 flex flex-col">

        {/* Top Controls */}
        <div className="flex justify-center gap-4 p-4">
          <button
            onClick={() =>
              setMicEnabled(!micEnabled)
            }
            className={`p-3 rounded-xl ${
              micEnabled
                ? "bg-green-600"
                : "bg-zinc-800"
            }`}
          >
            {micEnabled ? (
              <Mic size={20} />
            ) : (
              <MicOff size={20} />
            )}
          </button>

          <button
            onClick={() =>
              setCameraEnabled(!cameraEnabled)
            }
            className={`p-3 rounded-xl ${
              cameraEnabled
                ? "bg-green-600"
                : "bg-zinc-800"
            }`}
          >
            {cameraEnabled ? (
              <Video size={20} />
            ) : (
              <VideoOff size={20} />
            )}
          </button>

          <button className="p-3 rounded-xl bg-red-600 hover:bg-red-500">
            <PhoneOff size={20} />
          </button>
        </div>

        {/* Center Area */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold">
              English Practice Room
            </h1>

            <p className="text-zinc-400 mt-2 font-extrabold">
              {userCount <= 1 ? `${userCount} Participant Online` : `${userCount} Participants Online`}
            </p>

            <span className="inline-block mt-4 px-3 py-1 bg-indigo-600 rounded-full text-sm">
              English
            </span>
          </div>
        </div>

        {/* Participants */}
        <div className="border-t border-zinc-800 p-4">
          <div className="flex gap-4 overflow-x-auto justify-center">
            {participants.map((user) => (
              <ParticipantCard
                key={user?.userId}
                participant={user}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Chat */}
      <ChatPanel />
    </div>
  );
}
function ParticipantCard({
  participant,
}: ParticipantProps) {
  return (
    <div className="min-w-25 bg-zinc-900 rounded-xl p-2 flex flex-col items-center border border-zinc-800">
      <img
        src={participant.imageUrl}
        alt={participant.name}
        className="w-16 h-16 rounded-full object-cover"
      />

      <p className="mt-2 text-sm text-center truncate w-full">
        {participant.name}
      </p>
    </div>
  );
}