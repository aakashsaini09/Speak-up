"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "@/lib/socket";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Mic, MicOff, Video, VideoOff, SquareArrowRightExit } from "lucide-react";
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

  // ── WebRTC Refs (stable, no re-render needed) ────────────────────────────
  const peerConnections = useRef(new Map<string, RTCPeerConnection>());
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudios = useRef(new Map<string, HTMLAudioElement>());
  // Buffers ICE candidates that arrive before setRemoteDescription is called
  const iceCandidateBuffers = useRef(new Map<string, RTCIceCandidate[]>());

  // ─── WebRTC Helpers ───────────────────────────────────────────────────────
  //
  // These only touch refs (which are always current), so useCallback(fn, [])
  // is correct and safe — they never go stale.

  /**
   * Creates a fully wired RTCPeerConnection for the given remote userId.
   *
   * KEY FIX: Previously, createOfferFunction built RTCPeerConnections manually
   * and forgot to set pc.ontrack — so the offerer never received audio back
   * from the answerer. This helper is now the single place that sets up ALL
   * peer connection handlers, used on BOTH the offer and answer sides.
   */
  const createPeerConnection = useCallback((userId: string): RTCPeerConnection => {
    // Close any stale connection for this user before creating a new one
    peerConnections.current.get(userId)?.close();

    const pc = new RTCPeerConnection(RTC_CONFIG); // FIX: STUN was missing in the offerer path

    // Add our local audio track so the remote peer can hear us
    localStream.current?.getAudioTracks().forEach(track => {
      pc.addTrack(track, localStream.current!);
    });

    // ✅ FIX (main audio bug): Receive remote audio.
    // This handler was completely absent in the old createOfferFunction,
    // which is why the person who created the offer could never hear anyone.
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

    // Trickle ICE: send our candidates to the remote peer as they're gathered
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          targetUserId: userId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] ${userId} → ${pc.connectionState}`);
      // Attempt ICE restart on failure instead of giving up
      if (pc.connectionState === "failed") {
        console.warn(`[WebRTC] Connection to ${userId} failed, restarting ICE`);
        pc.restartIce();
      }
    };

    peerConnections.current.set(userId, pc);
    return pc;
  }, []);

  /**
   * Applies any ICE candidates that arrived before setRemoteDescription was
   * called. Always call this immediately after setRemoteDescription.
   */
  const drainIceCandidates = useCallback(
    async (userId: string, pc: RTCPeerConnection) => {
      const buffered = iceCandidateBuffers.current.get(userId) ?? [];
      for (const candidate of buffered) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (err) {
          console.warn("[ICE] Buffered candidate rejected:", err);
        }
      }
      iceCandidateBuffers.current.delete(userId);
    },
    []
  );

  /**
   * Tears down all peer connections and removes injected <audio> elements.
   * Call this on leave AND in the useEffect cleanup to prevent duplicate
   * connections when the user navigates back to the same room.
   */
  const cleanupAll = useCallback(() => {
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();

    remoteAudios.current.forEach(audio => {
      audio.srcObject = null;
      audio.remove();
    });
    remoteAudios.current.clear();

    iceCandidateBuffers.current.clear();
  }, []);

  // ─── Socket + Media Setup ─────────────────────────────────────────────────

  useEffect(() => {
    // Don't proceed until Clerk has resolved the user
    if (!user?.id) return;

    const joinData = {
      roomId,
      userId: user.id,
      name: user.firstName,
      imageUrl: user.imageUrl,
    };

    const handleCount = (count: number) => setUserCount(count);
    const handleParticipants = (data: Participant[]) => setParticipants(data);

    socket.on("participants-count", handleCount);
    socket.on("participants-update", handleParticipants);

    // ── Offerer side ────────────────────────────────────────────────────────
    // Server sends this only to the newly joining socket, listing who's already
    // in the room. We create one offer per existing participant.
    socket.on("existing-participants", async (existing: Participant[]) => {
      const others = existing.filter(p => p.userId !== user.id);
      for (const p of others) {
        // Guard: don't double-connect if a PC already exists (e.g. re-mount)
        if (peerConnections.current.has(p.userId)) continue;

        const pc = createPeerConnection(p.userId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("webrtc-offer", {
          targetUserId: p.userId,
          sdp: pc.localDescription,
        });
      }
    });

    // ── Answerer side ───────────────────────────────────────────────────────
    // An existing participant receives this when someone new joins and sends
    // them an offer.
    socket.on(
      "webrtc-offer",
      async (data: { senderUserId: string; sdp: RTCSessionDescriptionInit }) => {
        const pc = createPeerConnection(data.senderUserId); // also closes stale PC

        await pc.setRemoteDescription(data.sdp);
        await drainIceCandidates(data.senderUserId, pc); // flush early candidates

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("webrtc-answer", {
          targetUserId: data.senderUserId,
          sdp: pc.localDescription,
        });
      }
    );

    // ── Offerer receives the answer ─────────────────────────────────────────
    socket.on(
      "webrtc-answer",
      async (data: { senderUserId: string; sdp: RTCSessionDescriptionInit }) => {
        const pc = peerConnections.current.get(data.senderUserId);
        if (!pc) {
          console.warn("[WebRTC] No PC found for answer from:", data.senderUserId);
          return;
        }
        // Guard against duplicate answers (e.g. from reconnection attempts)
        if (pc.signalingState !== "have-local-offer") {
          console.warn("[WebRTC] Ignoring answer in state:", pc.signalingState);
          return;
        }

        await pc.setRemoteDescription(data.sdp);
        await drainIceCandidates(data.senderUserId, pc); // flush early candidates
      }
    );

    // ── ICE candidate exchange ──────────────────────────────────────────────
    // FIX: If the candidate arrives before setRemoteDescription (race condition),
    // buffer it and apply it once the remote description is set via drainIceCandidates.
    socket.on(
      "ice-candidate",
      async (data: { senderUserId: string; candidate: RTCIceCandidateInit }) => {
        const pc = peerConnections.current.get(data.senderUserId);

        if (!pc?.remoteDescription) {
          // Remote description not yet set — buffer for later
          const buf = iceCandidateBuffers.current.get(data.senderUserId) ?? [];
          buf.push(data.candidate as RTCIceCandidate);
          iceCandidateBuffers.current.set(data.senderUserId, buf);
          return;
        }

        try {
          await pc.addIceCandidate(data.candidate);
        } catch (err) {
          console.warn("[ICE] addIceCandidate failed:", err);
        }
      }
    );

    // ── Get mic access, then join ───────────────────────────────────────────
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // ✅ FIX: Start muted so the UI state (micEnabled = false) matches reality.
        // The old code set enabled = true here, causing audio to leak before the
        // user ever clicked the mic button.
        stream.getAudioTracks()[0].enabled = false;
        localStream.current = stream;
        socket.emit("join-room", joinData);
      } catch (err) {
        console.error("[Media] Microphone access denied:", err);
      }
    })();

    // ── Cleanup on unmount or deps change ───────────────────────────────────
    // FIX: Without this, leaving and re-joining the same room would layer new
    // RTCPeerConnections on top of old ones (visible in webrtc-internals).
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
    <div className="h-screen bg-zinc-950 text-white flex">

      {/* Main section */}
      <div className="flex-1 flex flex-col">

        {/* Top controls */}
        <div className="flex justify-center gap-4 p-4">
          <button
            onClick={toggleMic}
            title={micEnabled ? "Mute microphone" : "Unmute microphone"}
            className={`p-3 rounded-xl transition-colors ${
              micEnabled
                ? "bg-green-600 hover:bg-green-500"
                : "bg-zinc-800 hover:bg-zinc-700"
            }`}
          >
            {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          <button
            onClick={() => setCameraEnabled(v => !v)}
            title={cameraEnabled ? "Disable camera" : "Enable camera"}
            className={`p-3 rounded-xl transition-colors ${
              cameraEnabled
                ? "bg-green-600 hover:bg-green-500"
                : "bg-zinc-800 hover:bg-zinc-700"
            }`}
          >
            {cameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          <button
            onClick={leaveRoom}
            title="Leave room"
            className="p-3 rounded-xl bg-red-600 hover:bg-red-500 transition-colors cursor-pointer"
          >
            <SquareArrowRightExit size={20} />
          </button>
        </div>

        {/* Room info */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold">English Practice Room</h1>
            <p className="text-zinc-400 mt-2 font-extrabold">
              {userCount === 1
                ? "1 Participant Online"
                : `${userCount} Participants Online`}
            </p>
            <span className="inline-block mt-4 px-3 py-1 bg-indigo-600 rounded-full text-sm">
              English
            </span>
          </div>
        </div>

        {/* Participant strip */}
        <div className="border-t border-zinc-800 p-4">
          <div className="flex gap-4 overflow-x-auto justify-center">
            {participants.map(p => (
              <ParticipantCard key={p.userId} participant={p} />
            ))}
          </div>
        </div>
      </div>

      {/* Chat sidebar */}
      <ChatPanel />
    </div>
  );
}

// ─── Participant Card ──────────────────────────────────────────────────────────

function ParticipantCard({ participant }: { participant: Participant }) {
  return (
    <div className="min-w-[100px] bg-zinc-900 rounded-xl p-2 flex flex-col items-center border border-zinc-800">
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