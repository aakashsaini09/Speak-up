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

  // ── UI state ─────────────────────────────────────────────────────────────
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  // userId of the focused participant (null = default grid view)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  // Which peers currently have an active video track
  const [peersWithVideo, setPeersWithVideo] = useState<Set<string>>(new Set());
  // Bumped whenever a remote video stream arrives/leaves so SelectedView re-reads the ref
  const [remoteVideoTick, setRemoteVideoTick] = useState(0);

  // ── WebRTC refs ──────────────────────────────────────────────────────────
  const peerConnections = useRef(new Map<string, RTCPeerConnection>());
  const localStream = useRef<MediaStream | null>(null);      // audio only
  const localVideoStream = useRef<MediaStream | null>(null); // camera (opt-in)
  const iceCandidateBuffers = useRef(new Map<string, RTCIceCandidate[]>());

  // ── Audio Web-API refs ───────────────────────────────────────────────────
  // Remote audio is routed through AudioContext so the browser AEC engine
  // gets a speaker-reference signal and can cancel echo from the mic.
  const audioCtx = useRef<AudioContext | null>(null);
  const remoteNodes = useRef(
    new Map<string, { el: HTMLAudioElement; source: MediaStreamAudioSourceNode }>()
  );

  // ── Remote video streams ─────────────────────────────────────────────────
  const remoteVideoStreams = useRef(new Map<string, MediaStream>());

  // ─── Audio helpers ─────────────────────────────────────────────────────────

  const getAudioCtx = (): AudioContext => {
    if (!audioCtx.current || audioCtx.current.state === "closed") {
      audioCtx.current = new AudioContext();
    }
    return audioCtx.current;
  };

  const removeRemoteAudio = useCallback((peerId: string) => {
    const node = remoteNodes.current.get(peerId);
    if (!node) return;
    try { node.source.disconnect(); } catch {}
    node.el.srcObject = null;
    node.el.remove();
    remoteNodes.current.delete(peerId);
  }, []);

  const addRemoteAudio = useCallback((peerId: string, stream: MediaStream) => {
    removeRemoteAudio(peerId);
    const ctx = getAudioCtx();
    ctx.resume();

    // Muted <audio> — kept only to satisfy autoplay policy on some browsers
    const el = document.createElement("audio");
    el.srcObject = stream;
    el.muted = true;
    el.autoplay = true;
    document.body.appendChild(el);

    // Graph: source → HPF(80 Hz) → compressor → gain(0.85) → destination
    const source = ctx.createMediaStreamSource(stream);
    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = 80;
    hpf.Q.value = 0.7;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 10;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.15;

    const gain = ctx.createGain();
    gain.gain.value = 0.85;

    source.connect(hpf);
    hpf.connect(compressor);
    compressor.connect(gain);
    gain.connect(ctx.destination);

    remoteNodes.current.set(peerId, { el, source });
  }, [removeRemoteAudio]);

  // ─── WebRTC helpers ────────────────────────────────────────────────────────

  /**
   * Creates a brand-new RTCPeerConnection for userId.
   *
   * IMPORTANT: do NOT call this for renegotiation (e.g. remote enabled camera).
   * The webrtc-offer handler reuses the existing PC in that case.
   */
  const createPeerConnection = useCallback((userId: string): RTCPeerConnection => {
    peerConnections.current.get(userId)?.close();
    const pc = new RTCPeerConnection(RTC_CONFIG);

    // Always add audio
    localStream.current?.getAudioTracks().forEach(track => {
      pc.addTrack(track, localStream.current!);
    });

    // Add video too if the camera was already on when this new peer connected
    if (localVideoStream.current) {
      localVideoStream.current.getVideoTracks().forEach(track => {
        pc.addTrack(track, localVideoStream.current!);
      });
    }

    pc.ontrack = ({ track, streams }) => {
      if (track.kind === "audio") {
        addRemoteAudio(userId, streams[0]);
      } else if (track.kind === "video") {
        // Store the stream and signal the UI
        remoteVideoStreams.current.set(userId, streams[0]);
        setPeersWithVideo(prev => new Set([...prev, userId]));
        setRemoteVideoTick(t => t + 1);

        // Clean up when the remote peer disables / stops their camera
        track.onended = () => {
          remoteVideoStreams.current.delete(userId);
          setPeersWithVideo(prev => { const n = new Set(prev); n.delete(userId); return n; });
          setRemoteVideoTick(t => t + 1);
        };
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.emit("ice-candidate", { targetUserId: userId, candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") pc.restartIce();
      if (pc.connectionState === "disconnected" || pc.connectionState === "closed") {
        removeRemoteAudio(userId);
        remoteVideoStreams.current.delete(userId);
        setPeersWithVideo(prev => { const n = new Set(prev); n.delete(userId); return n; });
      }
    };

    peerConnections.current.set(userId, pc);
    return pc;
  }, [addRemoteAudio, removeRemoteAudio]);

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
    iceCandidateBuffers.current.clear();
    remoteNodes.current.forEach((_, id) => removeRemoteAudio(id));
    remoteVideoStreams.current.clear();
    setPeersWithVideo(new Set());
    audioCtx.current?.close();
    audioCtx.current = null;
  }, [removeRemoteAudio]);

  // ─── Socket + media setup ──────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id || !roomId) router.push('/');

    const joinData = { roomId, userId: user.id, name: user.firstName, imageUrl: user.imageUrl };
    const handleCount = (count: number) => setUserCount(count);
    const handleParticipants = (data: Participant[]) => setParticipants(data);

    socket.on("participants-count", handleCount);
    socket.on("participants-update", handleParticipants);

    // Offerer path: we just joined, create offers to everyone already in the room
    socket.on("existing-participants", async (existing: Participant[]) => {
      for (const p of existing.filter(p => p.userId !== user.id)) {
        if (peerConnections.current.has(p.userId)) continue;
        const pc = createPeerConnection(p.userId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc-offer", { targetUserId: p.userId, sdp: pc.localDescription });
      }
    });

    // Answerer path — also handles renegotiation offers (e.g. remote enabled camera)
    socket.on("webrtc-offer", async (data: { senderUserId: string; sdp: RTCSessionDescriptionInit }) => {
      // If an active connection already exists, this is a renegotiation — reuse the PC.
      // Only create a new one if there's no usable connection.
      const existing = peerConnections.current.get(data.senderUserId);
      const isRenegotiation = !!existing
        && existing.connectionState !== "closed"
        && existing.connectionState !== "failed";

      const pc = isRenegotiation ? existing! : createPeerConnection(data.senderUserId);

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

    // Get mic only — camera is opt-in via the button
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
        });
        stream.getAudioTracks()[0].enabled = false; // start muted, matches UI
        localStream.current = stream;
        socket.emit("join-room", joinData);
      } catch (err) {
        console.error("[Media] Microphone access denied:", err);
      }
    })();

    return () => {
      cleanupAll();
      localStream.current?.getTracks().forEach(t => t.stop());
      localVideoStream.current?.getTracks().forEach(t => t.stop());
      localStream.current = null;
      localVideoStream.current = null;
      socket.off("participants-count", handleCount);
      socket.off("participants-update", handleParticipants);
      socket.off("existing-participants");
      socket.off("webrtc-offer");
      socket.off("webrtc-answer");
      socket.off("ice-candidate");
      socket.off("room-message");
    };
  }, [roomId, user?.id, createPeerConnection, drainIceCandidates, cleanupAll]);

  // ─── Controls ──────────────────────────────────────────────────────────────

  const toggleMic = () => {
    const track = localStream.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicEnabled(track.enabled);
  };

  const toggleCam = async () => {
    if (cameraEnabled) {
      localVideoStream.current?.getTracks().forEach(t => t.stop());
      localVideoStream.current = null;
      setCameraEnabled(false);
    } else {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        localVideoStream.current = videoStream;
        const videoTrack = videoStream.getVideoTracks()[0];

        for (const [peerId, pc] of peerConnections.current) {
          const existingSender = pc.getSenders().find(s => s.track?.kind === "video");

          if (existingSender) {
            // replaceTrack keeps the same codec — no renegotiation needed
            await existingSender.replaceTrack(videoTrack);
          } else {
            // First time adding video to this PC — must renegotiate
            pc.addTrack(videoTrack, videoStream);
            if (pc.signalingState === "stable") {
              try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit("webrtc-offer", { targetUserId: peerId, sdp: pc.localDescription });
              } catch (err) {
                console.error("[Camera] Renegotiation failed for", peerId, err);
              }
            }
          }
        }

        setCameraEnabled(true);
      } catch (err) {
        console.error("[Camera] Access denied:", err);
      }
    }
  };

  const leaveRoom = () => {
    cleanupAll();
    localStream.current?.getTracks().forEach(t => t.stop());
    localVideoStream.current?.getTracks().forEach(t => t.stop());
    localStream.current = null;
    localVideoStream.current = null;
    socket.emit("leave-room");
    router.push("/");
  };

  const handleParticipantClick = (userId: string) => {
    // Toggle: clicking the already-selected participant deselects
    setSelectedUserId(prev => (prev === userId ? null : userId));
  };

  // ─── Render ────────────────────────────────────────────────────────────────

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
          <h1 className="text-sm font-semibold text-white leading-none">
            English Practice Room
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5 inline-flex items-center gap-1">
            <Users size={10} />
            {userCount === 1 ? "1 participant" : `${userCount} participants`}
          </p>
        </div>

        <span className="px-2.5 py-1 bg-violet-950/60 border border-violet-800/40 text-violet-300 rounded-full text-xs font-semibold">
          English
        </span>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {selectedUserId ? (
          /*
           * FOCUSED VIEW
           * Top area: selected participant's video or portrait
           * Bottom strip: scrollable row of all participants to switch between
           */
          <>
            <div className="flex-1 flex items-center justify-center p-6 overflow-hidden min-h-0">
              {(() => {
                const selected = participants.find(p => p.userId === selectedUserId);
                if (!selected) return null;
                return (
                  <SelectedParticipantView
                    userId={selectedUserId}
                    participant={selected}
                    isLocalUser={selectedUserId === user?.id}
                    localVideoStream={localVideoStream}
                    remoteVideoStreams={remoteVideoStreams}
                    remoteVideoTick={remoteVideoTick}
                    peersWithVideo={peersWithVideo}
                    cameraEnabled={cameraEnabled}
                  />
                );
              })()}
            </div>

            {/* Participant strip — always visible so you can switch focus */}
            <div className="shrink-0 border-t border-zinc-800/40 px-4 py-2.5">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {participants.map(p => (
                  <ParticipantStrip
                    key={p.userId}
                    participant={p}
                    isSelected={p.userId === selectedUserId}
                    hasVideo={p.userId === user?.id ? cameraEnabled : peersWithVideo.has(p.userId)}
                    onClick={() => handleParticipantClick(p.userId)}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          /*
           * DEFAULT GRID VIEW
           * Click any card to enter the focused view for that participant.
           */
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
            {participants.length === 0 ? (
              <EmptyRoom />
            ) : (
              <div className="flex flex-wrap gap-6 justify-center items-center max-w-2xl">
                {participants.map(p => (
                  <ParticipantCard
                    key={p.userId}
                    participant={p}
                    hasVideo={p.userId === user?.id ? cameraEnabled : peersWithVideo.has(p.userId)}
                    isLocalUser={p.userId === user?.id}
                    onClick={() => handleParticipantClick(p.userId)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom controls ──────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-zinc-800/60 px-6 py-5 flex items-center justify-center gap-3">
        <ControlBtn
          onClick={toggleMic}
          active={micEnabled}
          title={micEnabled ? "Mute" : "Unmute"}
          activeClass="bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-600/30"
          inactiveClass="bg-zinc-800 hover:bg-zinc-700"
        >
          {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </ControlBtn>

        <ControlBtn
          onClick={toggleCam}
          active={cameraEnabled}
          title={cameraEnabled ? "Disable camera" : "Enable camera"}
          activeClass="bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-600/30"
          inactiveClass="bg-zinc-800 hover:bg-zinc-700"
        >
          {cameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
        </ControlBtn>

        <ControlBtn
          onClick={() => setChatOpen(v => !v)}
          active={chatOpen}
          title="Room chat"
          activeClass="bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-600/30"
          inactiveClass="bg-zinc-800 hover:bg-zinc-700"
        >
          <MessageSquare size={20} />
        </ControlBtn>

        <div className="w-px h-8 bg-zinc-800 mx-1" />

        <button
          onClick={leaveRoom}
          title="Leave room"
          className="p-3 rounded-xl bg-red-600 hover:bg-red-500 transition-colors cursor-pointer"
        >
          <PhoneOff size={20} />
        </button>
      </div>

      {/* ── Chat overlay (z-50, does not shift layout) ───────────────────────── */}
      <div
        onClick={() => setChatOpen(false)}
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          chatOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />
      <div
        className={`fixed top-0 right-0 h-full w-80 sm:w-96 z-50 flex flex-col
          bg-zinc-900 border-l border-zinc-800 shadow-2xl shadow-black/60
          transition-transform duration-300 ease-in-out
          ${chatOpen ? "translate-x-0" : "translate-x-full"}`}
      >
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
        <div className="flex-1 overflow-hidden">
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Focused view for a single participant.
 * Shows their video if camera is on, or a portrait card if it's off.
 *
 * Reads streams from refs and re-runs when `remoteVideoTick` bumps so the
 * video element gets the fresh stream without unnecessary re-renders.
 */
function SelectedParticipantView({
  userId, participant, isLocalUser,
  localVideoStream, remoteVideoStreams,
  remoteVideoTick, peersWithVideo, cameraEnabled,
}: {
  userId: string;
  participant: Participant;
  isLocalUser: boolean;
  localVideoStream: React.MutableRefObject<MediaStream | null>;
  remoteVideoStreams: React.MutableRefObject<Map<string, MediaStream>>;
  remoteVideoTick: number;
  peersWithVideo: Set<string>;
  cameraEnabled: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const hasVideo = isLocalUser ? cameraEnabled : peersWithVideo.has(userId);
  const stream = isLocalUser
    ? localVideoStream.current
    : remoteVideoStreams.current.get(userId);

  // Attach stream to video element whenever the stream or tick changes
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !stream || !hasVideo) return;
    el.srcObject = stream;
    el.play().catch(() => {});
    return () => { el.srcObject = null; };
  }, [stream, hasVideo, remoteVideoTick]);

  if (hasVideo && stream) {
    return (
      <div className="w-full max-w-2xl relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/80 shadow-2xl shadow-black/40">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocalUser} // mute self-view to prevent echo
          className="w-full aspect-video object-cover"
        />
        {/* Gradient name overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 via-black/30 to-transparent px-5 py-4">
          <p className="text-white font-semibold">{participant.name}</p>
          {isLocalUser && <p className="text-zinc-400 text-xs mt-0.5">You</p>}
        </div>
      </div>
    );
  }

  // Camera is off — show portrait
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="relative">
        <img
          src={participant.imageUrl}
          alt={participant.name}
          className="w-32 h-32 rounded-full object-cover border-2 border-zinc-700 shadow-lg"
        />
        <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-zinc-950" />
      </div>
      <div>
        <p className="text-white text-xl font-semibold">{participant.name}</p>
        {isLocalUser && <p className="text-zinc-500 text-sm mt-0.5">You</p>}
      </div>
      <span className="inline-flex items-center gap-2 text-zinc-500 text-sm bg-zinc-900/60 border border-zinc-800 px-3 py-1.5 rounded-full">
        <VideoOff size={13} />
        Camera is off
      </span>
    </div>
  );
}

/**
 * Compact avatar shown in the horizontal strip at the bottom of the focused view.
 * Violet outline = currently selected. Camera icon badge = has video active.
 */
function ParticipantStrip({
  participant, isSelected, hasVideo, onClick,
}: {
  participant: Participant;
  isSelected: boolean;
  hasVideo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer shrink-0 border ${
        isSelected
          ? "bg-violet-600/20 border-violet-600/40"
          : "border-transparent hover:bg-zinc-800/60"
      }`}
    >
      <div className="relative">
        <img
          src={participant.imageUrl}
          alt={participant.name}
          className={`w-11 h-11 rounded-full object-cover border-2 transition-colors ${
            isSelected ? "border-violet-500" : "border-zinc-700"
          }`}
        />
        {hasVideo && (
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-violet-600 border-2 border-zinc-950 flex items-center justify-center">
            <Video size={8} className="text-white" />
          </span>
        )}
      </div>
      <p className="text-[11px] text-zinc-400 max-w-13 truncate">{participant.name}</p>
    </button>
  );
}

/**
 * Participant card in the default grid view.
 * Camera badge on top-right corner when the peer has video active.
 */
function ParticipantCard({
  participant, hasVideo, isLocalUser, onClick,
}: {
  participant: Participant;
  hasVideo: boolean;
  isLocalUser: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2.5 group cursor-pointer">
      <div className="relative">
        {/* Soft glow ring on hover */}
        <div className="absolute -inset-1 rounded-full bg-violet-600/0 group-hover:bg-violet-600/20 transition-all duration-300 blur-sm" />
        <img
          src={participant.imageUrl}
          alt={participant.name}
          className="relative w-20 h-20 rounded-full object-cover border-2 border-zinc-700 group-hover:border-violet-600/60 transition-colors duration-300"
        />
        {/* Online dot */}
        <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-zinc-950" />
        {/* Camera-on badge */}
        {hasVideo && (
          <span className="absolute top-0 right-0 w-5 h-5 rounded-full bg-violet-600 border-2 border-zinc-950 flex items-center justify-center">
            <Video size={9} className="text-white" />
          </span>
        )}
      </div>
      <div className="text-center">
        <p className="text-sm text-zinc-300 font-medium max-w-20 truncate">{participant.name}</p>
        {isLocalUser && <p className="text-[10px] text-zinc-600 mt-0.5">You</p>}
      </div>
    </button>
  );
}

/** Empty room placeholder */
function EmptyRoom() {
  return (
    <div className="text-center select-none">
      <div className="relative mx-auto w-24 h-24 mb-5">
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

/** Reusable control button for the bottom bar */
function ControlBtn({
  children, onClick, active, title, activeClass, inactiveClass,
}: {
  children: React.ReactNode;
  onClick: () => void | Promise<void>;
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
