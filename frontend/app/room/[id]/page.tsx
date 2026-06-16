"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "@/lib/socket";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Mic, MicOff, Video, VideoOff,
  PhoneOff, MessageSquare, X, ArrowLeft, Users,
} from "lucide-react";
import ChatPanel from "@/components/ChatPanel";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type Participant = {
  userId: string;
  name: string;
  imageUrl: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function RoomPage() {
  const router = useRouter();
  const { user } = useUser();
  const { id: roomId } = useParams();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);        // ← new: chat overlay toggle

  // ── WebRTC refs ─────────────────────────────────────────────────────────────
  const peerConnections = useRef(new Map<string, RTCPeerConnection>());
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudios = useRef(new Map<string, HTMLAudioElement>());
  const iceCandidateBuffers = useRef(new Map<string, RTCIceCandidate[]>());

  // ─── WebRTC helpers ───────────────────────────────────────────────────────

  const createPeerConnection = useCallback((userId: string): RTCPeerConnection => {
    peerConnections.current.get(userId)?.close();
    const pc = new RTCPeerConnection(RTC_CONFIG);

    localStream.current?.getAudioTracks().forEach(track => {
      pc.addTrack(track, localStream.current!);
    });

    pc.ontrack = (event) => {
      let audio = remoteAudios.current.get(userId);
      if (!audio) {
        audio = document.createElement("audio");
        audio.autoplay = true;
        document.body.appendChild(audio);
        remoteAudios.current.set(userId, audio);
      }
      audio.srcObject = event.streams[0];
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { targetUserId: userId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") pc.restartIce();
    };

    peerConnections.current.set(userId, pc);
    return pc;
  }, []);

  const drainIceCandidates = useCallback(async (userId: string, pc: RTCPeerConnection) => {
    const buffered = iceCandidateBuffers.current.get(userId) ?? [];
    for (const candidate of buffered) {
      try { await pc.addIceCandidate(candidate); }
      catch (err) { console.warn("[ICE] buffered candidate failed:", err); }
    }
    iceCandidateBuffers.current.delete(userId);
  }, []);

  const cleanupAll = useCallback(() => {
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    remoteAudios.current.forEach(audio => { audio.srcObject = null; audio.remove(); });
    remoteAudios.current.clear();
    iceCandidateBuffers.current.clear();
  }, []);

  // ─── Socket + media setup ─────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return;

    const joinData = { roomId, userId: user.id, name: user.firstName, imageUrl: user.imageUrl };
    const handleCount = (count: number) => setUserCount(count);
    const handleParticipants = (data: Participant[]) => setParticipants(data);

    socket.on("participants-count", handleCount);
    socket.on("participants-update", handleParticipants);

    socket.on("existing-participants", async (existing: Participant[]) => {
      for (const p of existing.filter(p => p.userId !== user.id)) {
        if (peerConnections.current.has(p.userId)) continue;
        const pc = createPeerConnection(p.userId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc-offer", { targetUserId: p.userId, sdp: pc.localDescription });
      }
    });

    socket.on("webrtc-offer", async (data: { senderUserId: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = createPeerConnection(data.senderUserId);
      await pc.setRemoteDescription(data.sdp);
      await drainIceCandidates(data.senderUserId, pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc-answer", { targetUserId: data.senderUserId, sdp: pc.localDescription });
    });

    socket.on("webrtc-answer", async (data: { senderUserId: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = peerConnections.current.get(data.senderUserId);
      if (!pc || pc.signalingState !== "have-local-offer") return;
      await pc.setRemoteDescription(data.sdp);
      await drainIceCandidates(data.senderUserId, pc);
    });

    socket.on("ice-candidate", async (data: { senderUserId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnections.current.get(data.senderUserId);
      if (!pc?.remoteDescription) {
        const buf = iceCandidateBuffers.current.get(data.senderUserId) ?? [];
        buf.push(data.candidate as RTCIceCandidate);
        iceCandidateBuffers.current.set(data.senderUserId, buf);
        return;
      }
      try { await pc.addIceCandidate(data.candidate); }
      catch (err) { console.warn("[ICE] addIceCandidate failed:", err); }
    });

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getAudioTracks()[0].enabled = false;
        localStream.current = stream;
        socket.emit("join-room", joinData);
      } catch (err) {
        console.error("[Media] Microphone access denied:", err);
      }
    })();

    return () => {
      cleanupAll();
      localStream.current?.getTracks().forEach(t => t.stop());
      localStream.current = null;
      socket.off("participants-count", handleCount);
      socket.off("participants-update", handleParticipants);
      socket.off("existing-participants");
      socket.off("webrtc-offer");
      socket.off("webrtc-answer");
      socket.off("ice-candidate");
      socket.off("room-message");
    };
  }, [roomId, user?.id, createPeerConnection, drainIceCandidates, cleanupAll]);

  // ─── Controls ─────────────────────────────────────────────────────────────

  const toggleMic = () => {
    const track = localStream.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicEnabled(track.enabled);
  };

  const leaveRoom = () => {
    cleanupAll();
    localStream.current?.getTracks().forEach(t => t.stop());
    localStream.current = null;
    socket.emit("leave-room");
    router.push("/");
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm shrink-0">
        <button
          onClick={leaveRoom}
          title="Leave room"
          className="p-2 rounded-xl hover:bg-zinc-800/80 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="text-center">
          <h1 className="text-lg font-semibold text-white leading-none">
            English Practice Room
          </h1>
          <p className="text-base text-zinc-500 mt-0.5">
            <span className="inline-flex items-center gap-1">
              <Users size={18} />
              {userCount === 1 ? "1 participant" : `${userCount} participants`}
            </span>
          </p>
        </div>

        <span className="px-2.5 py-1 bg-violet-950/60 border border-violet-800/40 text-violet-300 rounded-full text-md font-semibold">
          English
        </span>
      </div>

      {/* ── Participants ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        {participants.length === 0 ? (
          <EmptyRoom />
        ) : (
          <div className="flex flex-wrap gap-8 justify-center items-center max-w-lg">
            {participants.map(p => (
              <ParticipantCard key={p.userId} participant={p} />
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom controls ──────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-zinc-800/60 px-6 py-5 flex items-center justify-center gap-3">

        {/* Mic */}
        <ControlBtn
          onClick={toggleMic}
          active={micEnabled}
          title={micEnabled ? "Mute" : "Unmute"}
          activeClass="bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-600/30"
          inactiveClass="bg-zinc-800 hover:bg-zinc-700"
        >
          {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </ControlBtn>

        {/* Camera */}
        <ControlBtn
          onClick={() => setCameraEnabled(v => !v)}
          active={cameraEnabled}
          title={cameraEnabled ? "Disable camera" : "Enable camera"}
          activeClass="bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-600/30"
          inactiveClass="bg-zinc-800 hover:bg-zinc-700"
        >
          {cameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
        </ControlBtn>

        {/* Chat toggle — the key fix: no longer a sidebar, just opens the overlay */}
        <ControlBtn
          onClick={() => setChatOpen(v => !v)}
          active={chatOpen}
          title="Room chat"
          activeClass="bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-600/30"
          inactiveClass="bg-zinc-800 hover:bg-zinc-700"
        >
          <MessageSquare size={20} />
        </ControlBtn>

        {/* Divider */}
        <div className="w-px h-8 bg-zinc-800 mx-1" />

        {/* Leave */}
        <button
          onClick={leaveRoom}
          title="Leave room"
          className="p-3 rounded-xl bg-red-600 hover:bg-red-500 transition-colors cursor-pointer"
        >
          <PhoneOff size={20} />
        </button>
      </div>

      {/* ── Chat overlay ─────────────────────────────────────────────────────
           Fixed, z-50 — sits on top of everything, does NOT shift the layout.
           Backdrop closes it when clicked. Panel slides in from the right.   */}

      {/* Backdrop */}
      <div
        onClick={() => setChatOpen(false)}
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          chatOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Slide-in panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 sm:w-96 z-50 flex flex-col
          bg-zinc-900 border-l border-zinc-800 shadow-2xl shadow-black/60
          transition-transform duration-300 ease-in-out
          ${chatOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <MessageSquare size={15} className="text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Room Chat</h2>
          </div>
          <button
            onClick={() => setChatOpen(false)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* ChatPanel fills remaining height */}
        <div className="flex-1 overflow-hidden">
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Ghost state shown when no one else is in the room yet */
function EmptyRoom() {
  return (
    <div className="text-center select-none">
      <div className="relative mx-auto w-24 h-24 mb-5">
        {/* Pulsing outer ring */}
        <div className="absolute inset-0 rounded-full border-2 border-violet-600/20 animate-ping" />
        <div className="w-24 h-24 rounded-full border-2 border-dashed border-zinc-700 flex items-center justify-center relative">
          <Mic size={28} className="text-zinc-600" />
        </div>
      </div>
      <p className="text-white font-semibold">You're the first one here</p>
      <p className="text-zinc-500 text-sm mt-1.5">Waiting for others to join…</p>
    </div>
  );
}

/** A speaker tile in the main area */
function ParticipantCard({ participant }: { participant: Participant }) {
  return (
    <div className="flex flex-col items-center gap-2.5 group">
      <div className="relative">
        {/* Subtle glow ring on hover — suggests "this person might be speaking" */}
        <div className="absolute -inset-1 rounded-full bg-violet-600/0 group-hover:bg-violet-600/20 transition-all duration-300 blur-sm" />
        <img
          src={participant.imageUrl}
          alt={participant.name}
          className="relative w-20 h-20 rounded-full object-cover border-2 border-zinc-700 group-hover:border-violet-600/60 transition-colors duration-300"
        />
        {/* Online dot */}
        <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-zinc-950" />
      </div>
      <p className="text-sm text-zinc-300 font-medium text-center max-w-20 truncate">
        {participant.name}
      </p>
    </div>
  );
}

/** Reusable control button for the bottom bar */
function ControlBtn({
  children, onClick, active, title, activeClass, inactiveClass,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  title: string;
  activeClass: string;
  inactiveClass: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-3 rounded-xl transition-all cursor-pointer ${active ? activeClass : inactiveClass}`}
    >
      {children}
    </button>
  );
}