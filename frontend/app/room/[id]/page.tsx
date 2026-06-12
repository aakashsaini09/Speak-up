"use client";

import { useEffect, useRef, useState } from "react";
import { socket } from "@/lib/socket";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Mic, MicOff, Video, VideoOff, PhoneOff, SquareArrowRightExit } from "lucide-react";
import ChatPanel from "@/components/ChatPanel";
import { useRouter } from "next/navigation";
import PrivateRoomChat from "@/components/PrivateRoomChat";
type Participant = {
  userId: string;
  name: string;
  imageUrl: string;
};

type ParticipantProps = {
  participant: Participant;
};
export default function Page() {
  const router = useRouter()
  const { user } = useUser();
  const { id } = useParams();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [loading, setloading] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const peerConnections = useRef(new Map<string, RTCPeerConnection>());
  useEffect(() => {
    const userAndRoomData = {
      roomId: id,
      userId: user?.id,
      name: user?.firstName,
      imageUrl: user?.imageUrl
    };
    const handleCount = (count: number) => {
      // console.log("Count Hit: ", count)
      setUserCount(count);
    };
    const handleParticipants = (data: Participant[]) => {
      console.log("participants: ", data)
      setParticipants(data);
    };
    const createOfferFunction = async (participants: Participant[]) => {
      for (const participant of participants) {
        const pc = new RTCPeerConnection();
        peerConnections.current.set(  participant.userId, pc );
        pc.onicecandidate = (  event  ) => {
          if (event.candidate) {
            socket.emit( "ice-candidate",  {
                targetUserId:
                  participant.userId,
                candidate:
                  event.candidate
              }
            );
          }
        };
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc-offer", {
          targetUserId: participant.userId,
          sdp: pc.localDescription
        }
        );
      }
    };
    // console.log("JOINING");
    socket.on("participants-count", (count) => {
      handleCount(count)
    });
    socket.on("existing-participants", participants => {
      createOfferFunction(participants)
    })
    socket.on("participants-update", handleParticipants)
    socket.emit("join-room", userAndRoomData);
    // socket.on("leave-room", (data) => {
    //   console.log(data);
    // });
    return () => {
      // socket.emit("leave-room")
      socket.off("room-message");
      socket.off("message");
      socket.off("participants-count", handleCount);
      socket.off("participants-update", handleParticipants);
    }
  }, [id, user?.id]);
  const audioFunction = async () => {
    setloading(true)
    setMicEnabled(!micEnabled);
  }
  const leaveRoom = () => {
    socket.emit(
      "leave-room"
    );
    router.push("/");
  }
  return (
    <div className="h-screen bg-zinc-950 text-white flex">
      {/* Main Section */}
      <div className="flex-1 flex flex-col w-full">

        {/* Top Controls */}
        <div className="flex justify-center gap-4 p-4">
          <button disabled={loading} onClick={() => audioFunction()}
            className={`p-3 rounded-xl ${micEnabled
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
            className={`p-3 rounded-xl ${cameraEnabled
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

          <button onClick={leaveRoom} className="p-3 rounded-xl bg-red-600 hover:bg-red-500 cursor-pointer">
            <SquareArrowRightExit size={20} />
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
      {/* <div className="absolute top-4 right-4">
        <PrivateRoomChat/>
      </div> */}
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