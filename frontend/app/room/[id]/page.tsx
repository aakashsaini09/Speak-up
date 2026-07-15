"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "@/lib/socket";
import { useParams } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  Mic, MicOff, Video, VideoOff,
  PhoneOff, MessageSquare, X, ArrowLeft, Users, UserX,
  ShieldCheck, UserRoundPlus, ScreenShare, ScreenShareOff,
  UserCheck, Loader2, UserMinus,
} from "lucide-react";
import ChatPanel from "@/components/ChatPanel";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type Participant = {
  userId: string;
  name: string;
  imageUrl: string;
};

/**
 * Outbound video source for the local user.
 * Extend with "whiteboard" | "youtube" when those shared surfaces land —
 * anything non-"off" should show the video badge on the participant profile.
 */
type VideoMode = "off" | "camera" | "screen";

/** Friendship relative to the current user, keyed by peer clerkId. */
type FriendRelation =
  | { status: "none" }
  | { status: "pending_out"; friendshipId: string }
  | { status: "pending_in"; friendshipId: string }
  | { status: "friends"; friendshipId: string };

type FriendRelations = Record<string, FriendRelation>;

const NONE_RELATION: FriendRelation = { status: "none" };
 
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};
 
export default function RoomPage() {
  const router = useRouter();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { id: roomId } = useParams();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

  // ── UI state ──────────────────────────────────────────────────────────────
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [micEnabled, setMicEnabled] = useState(false);
  const [videoMode, setVideoMode] = useState<VideoMode>("off");
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [peersWithVideo, setPeersWithVideo] = useState<Set<string>>(new Set());
  const [remoteVideoTick, setRemoteVideoTick] = useState(0);
  const [friendRelations, setFriendRelations] = useState<FriendRelations>({});
  const [friendBusyId, setFriendBusyId] = useState<string | null>(null);
 
  // ── Admin state ───────────────────────────────────────────────────────────
  const [isAdmin, setIsAdmin] = useState(false);         // true if current user is admin
  const [adminUserId, setAdminUserId] = useState<string | null>(null); // who the admin is
  const [kickedDialogOpen, setKickedDialogOpen] = useState(false);
 
  // ── WebRTC refs ───────────────────────────────────────────────────────────
  const peerConnections = useRef(new Map<string, RTCPeerConnection>());
  const localStream = useRef<MediaStream | null>(null);
  const localVideoStream = useRef<MediaStream | null>(null);
  const iceCandidateBuffers = useRef(new Map<string, RTCIceCandidate[]>());
 
  // ── Audio refs ────────────────────────────────────────────────────────────
  const audioCtx = useRef<AudioContext | null>(null);
  const remoteNodes = useRef(
    new Map<string, { el: HTMLAudioElement; source: MediaStreamAudioSourceNode }>()
  );
 
  // ── Video refs ────────────────────────────────────────────────────────────
  const remoteVideoStreams = useRef(new Map<string, MediaStream>());
 
  // ─── Audio helpers ─────────────────────────────────────────────────────────
 
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
 
    if (!audioCtx.current || audioCtx.current.state === "closed") {
      audioCtx.current = new AudioContext();
    }
    const ctx = audioCtx.current;
    ctx.resume();
 
    const el = document.createElement("audio");
    el.srcObject = stream;
    el.muted = true;
    el.autoplay = true;
    document.body.appendChild(el);
 
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
 
  const createPeerConnection = useCallback((userId: string): RTCPeerConnection => {
    peerConnections.current.get(userId)?.close();
    const pc = new RTCPeerConnection(RTC_CONFIG);
 
    localStream.current?.getAudioTracks().forEach(track => {
      pc.addTrack(track, localStream.current!);
    });
    if (localVideoStream.current) {
      localVideoStream.current.getVideoTracks().forEach(track => {
        pc.addTrack(track, localVideoStream.current!);
      });
    }
 
    pc.ontrack = ({ track, streams }) => {
      if (track.kind === "audio") {
        addRemoteAudio(userId, streams[0]);
      } else if (track.kind === "video") {
        remoteVideoStreams.current.set(userId, streams[0]);
        setPeersWithVideo(prev => new Set([...prev, userId]));
        setRemoteVideoTick(t => t + 1);
        track.onended = () => {
          remoteVideoStreams.current.delete(userId);
          setPeersWithVideo(prev => { const n = new Set(prev); n.delete(userId); return n; });
          setRemoteVideoTick(t => t + 1);
        };
      }
    };
 
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit("ice-candidate", { targetUserId: userId, candidate });
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
    if (!user?.id) return;
 
    const joinData = { roomId, userId: user.id, name: user.firstName, imageUrl: user.imageUrl };
    const handleCount        = (count: number)      => setUserCount(count);
    const handleParticipants = (data: Participant[]) => setParticipants(data);
 
    const handleExistingParticipants = async (existing: Participant[]) => {
      for (const p of existing.filter(p => p.userId !== user.id)) {
        if (peerConnections.current.has(p.userId)) continue;
        const pc = createPeerConnection(p.userId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc-offer", { targetUserId: p.userId, sdp: pc.localDescription });
      }
    };
 
    const handleOffer = async (data: { senderUserId: string; sdp: RTCSessionDescriptionInit }) => {
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
 
      if (!isRenegotiation && localVideoStream.current) {
        const negotiatedSDP = pc.localDescription?.sdp ?? "";
        if (!negotiatedSDP.includes("m=video")) {
          try {
            const videoOffer = await pc.createOffer();
            await pc.setLocalDescription(videoOffer);
            socket.emit("webrtc-offer", { targetUserId: data.senderUserId, sdp: pc.localDescription });
          } catch (err) {
            console.error("[Video] Late-joiner renegotiation failed:", err);
          }
        }
      }
    };
 
    const handleAnswer = async (data: { senderUserId: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = peerConnections.current.get(data.senderUserId);
      if (!pc || pc.signalingState !== "have-local-offer") return;
      await pc.setRemoteDescription(data.sdp);
      await drainIceCandidates(data.senderUserId, pc);
    };
 
    const handleIceCandidate = async (data: { senderUserId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnections.current.get(data.senderUserId);
      if (!pc?.remoteDescription) {
        const buf = iceCandidateBuffers.current.get(data.senderUserId) ?? [];
        buf.push(data.candidate as RTCIceCandidate);
        iceCandidateBuffers.current.set(data.senderUserId, buf);
        return;
      }
      try { await pc.addIceCandidate(data.candidate); }
      catch (err) { console.warn("[ICE] addIceCandidate failed:", err); }
    };
 
    // ── Admin events ─────────────────────────────────────────────────────────
    const handleIsAdmin  = (value: boolean)  => setIsAdmin(value);
    const handleAdminUser = (userId: string) => setAdminUserId(userId);
    const handleKicked   = () => {
      // Stop everything locally, show dialog, then redirect
      cleanupAll();
      localStream.current?.getTracks().forEach(t => t.stop());
      localVideoStream.current?.getTracks().forEach(t => {
        t.onended = null;
        t.stop();
      });
      localStream.current = null;
      localVideoStream.current = null;
      setVideoMode("off");
      setKickedDialogOpen(true);
    };
 
    socket.on("participants-count",    handleCount);
    socket.on("participants-update",   handleParticipants);
    socket.on("existing-participants", handleExistingParticipants);
    socket.on("webrtc-offer",          handleOffer);
    socket.on("webrtc-answer",         handleAnswer);
    socket.on("ice-candidate",         handleIceCandidate);
    socket.on("is-admin",              handleIsAdmin);
    socket.on("admin-user",            handleAdminUser);
    socket.on("kicked",                handleKicked);
 
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
        });
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
      localVideoStream.current?.getTracks().forEach(t => {
        t.onended = null;
        t.stop();
      });
      localStream.current = null;
      localVideoStream.current = null;
      socket.off("participants-count",    handleCount);
      socket.off("participants-update",   handleParticipants);
      socket.off("existing-participants", handleExistingParticipants);
      socket.off("webrtc-offer",          handleOffer);
      socket.off("webrtc-answer",         handleAnswer);
      socket.off("ice-candidate",         handleIceCandidate);
      socket.off("is-admin",              handleIsAdmin);
      socket.off("admin-user",            handleAdminUser);
      socket.off("kicked",                handleKicked);
      socket.off("room-message");
    };
  }, [roomId, user?.id, createPeerConnection, drainIceCandidates, cleanupAll]);
 
  // ─── Controls ──────────────────────────────────────────────────────────────

  const hasLocalVideo = videoMode !== "off";

  const stopLocalVideo = useCallback(async () => {
    localVideoStream.current?.getTracks().forEach(t => {
      t.onended = null;
      t.stop();
    });
    localVideoStream.current = null;
    for (const pc of peerConnections.current.values()) {
      const sender = pc.getSenders().find(s => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(null);
    }
    setVideoMode("off");
  }, []);

  /** Publish a video track to all peers (camera, screen, or future shared surfaces). */
  const publishLocalVideo = useCallback(async (stream: MediaStream, mode: Exclude<VideoMode, "off">) => {
    // Tear down the previous video source first (camera ↔ screen are mutually exclusive).
    localVideoStream.current?.getTracks().forEach(t => {
      t.onended = null;
      t.stop();
    });

    localVideoStream.current = stream;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      stream.getTracks().forEach(t => t.stop());
      localVideoStream.current = null;
      setVideoMode("off");
      return;
    }

    // Browser "Stop sharing" / device revoke should clear local video state.
    videoTrack.onended = () => {
      void stopLocalVideo();
    };

    for (const [peerId, pc] of peerConnections.current) {
      const existingSender = pc.getSenders().find(s => s.track?.kind === "video");
      if (existingSender) {
        await existingSender.replaceTrack(videoTrack);
      } else {
        pc.addTrack(videoTrack, stream);
        if (pc.signalingState === "stable") {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("webrtc-offer", { targetUserId: peerId, sdp: pc.localDescription });
          } catch (err) {
            console.error(`[Video:${mode}] Renegotiation failed for`, peerId, err);
          }
        }
      }
    }

    setVideoMode(mode);
  }, [stopLocalVideo]);

  const toggleMic = () => {
    const track = localStream.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicEnabled(track.enabled);
  };

  const toggleCam = async () => {
    if (videoMode === "camera") {
      await stopLocalVideo();
      return;
    }
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      await publishLocalVideo(videoStream, "camera");
    } catch (err) {
      console.error("[Camera] Access denied:", err);
      toast.error("Could not access camera");
    }
  };

  const toggleScreenShare = async () => {
    if (videoMode === "screen") {
      await stopLocalVideo();
      return;
    }
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      await publishLocalVideo(displayStream, "screen");
    } catch (err) {
      // User dismissed the picker — not an error worth toasting every time.
      if (err instanceof DOMException && err.name === "NotAllowedError") return;
      console.error("[ScreenShare] Failed:", err);
      toast.error("Could not start screen share");
    }
  };
 
  const leaveRoom = () => {
    cleanupAll();
    localStream.current?.getTracks().forEach(t => t.stop());
    localVideoStream.current?.getTracks().forEach(t => {
      t.onended = null;
      t.stop();
    });
    localStream.current = null;
    localVideoStream.current = null;
    setVideoMode("off");
    socket.emit("leave-room");
    router.push("/");
  };
 
  const kickUser = (targetUserId: string) => {
    if (!isAdmin) return;
    socket.emit("kick-user", { targetUserId });
  };
 
  const handleParticipantClick = (userId: string) => {
    setSelectedUserId(prev => (prev === userId ? null : userId));
  };

  // ─── Friend requests ───────────────────────────────────────────────────────

  const loadFriendRelations = useCallback(async () => {
    if (!user?.id) return;
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [friendsRes, sentRes, incomingRes] = await Promise.all([
        axios.get(`${backendUrl}/api/friend/friends`, { headers }),
        axios.get(`${backendUrl}/api/friend/request/send`, { headers }),
        axios.get(`${backendUrl}/api/friend/request`, { headers }),
      ]);

      const next: FriendRelations = {};

      for (const { friendshipId, user: friend } of friendsRes.data.friends ?? []) {
        if (friend?.clerkId) {
          next[friend.clerkId] = { status: "friends", friendshipId };
        }
      }
      for (const { friendshipId, user: peer } of sentRes.data.following ?? []) {
        if (peer?.clerkId && !next[peer.clerkId]) {
          next[peer.clerkId] = { status: "pending_out", friendshipId };
        }
      }
      for (const peer of incomingRes.data.following ?? []) {
        if (peer?.clerkId && !next[peer.clerkId]) {
          next[peer.clerkId] = {
            status: "pending_in",
            friendshipId: peer.friendshipId,
          };
        }
      }

      setFriendRelations(next);
    } catch (err) {
      console.error("[Friends] Failed to load relations:", err);
    }
  }, [backendUrl, getToken, user?.id]);

  useEffect(() => {
    void loadFriendRelations();
  }, [loadFriendRelations]);

  const sendFriendRequest = async (receiverId: string) => {
    const current = friendRelations[receiverId] ?? NONE_RELATION;
    if (current.status !== "none" || friendBusyId) return;

    setFriendBusyId(receiverId);
    try {
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/friend/requests`,
        { receiverId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const friendshipId = data?.friendship?._id;
      if (!friendshipId) {
        await loadFriendRelations();
      } else {
        setFriendRelations(prev => ({
          ...prev,
          [receiverId]: { status: "pending_out", friendshipId },
        }));
      }
      toast.success("Friend request sent");
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err)
          ? (err.response?.data?.message as string | undefined) ?? err.message
          : "Failed to send request";
      toast.error(message);
      // Sync in case the request already existed server-side.
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        void loadFriendRelations();
      }
    } finally {
      setFriendBusyId(null);
    }
  };

  const cancelFriendRequest = async (receiverId: string) => {
    const current = friendRelations[receiverId];
    if (current?.status !== "pending_out" || friendBusyId) return;

    setFriendBusyId(receiverId);
    try {
      const token = await getToken();
      await axios.delete(
        `${backendUrl}/api/friend/requests/${current.friendshipId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setFriendRelations(prev => {
        const next = { ...prev };
        delete next[receiverId];
        return next;
      });
      toast.success("Request cancelled");
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err)
          ? (err.response?.data?.message as string | undefined) ?? err.message
          : "Failed to cancel request";
      toast.error(message);
    } finally {
      setFriendBusyId(null);
    }
  };

  const getRelation = (userId: string): FriendRelation =>
    friendRelations[userId] ?? NONE_RELATION;

  // ─── Kicked dialog ─────────────────────────────────────────────────────────
 
  if (kickedDialogOpen) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
          <UserX className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold text-white">You were removed</h2>
          <p className="text-zinc-400 text-sm">
            The room admin has removed you from this room. You cannot rejoin.
          </p>
          <button
            onClick={() => router.push("/")}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg transition-colors"
          >
            Go home
          </button>
        </div>
      </div>
    );
  }

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
                    hasLocalVideo={hasLocalVideo}
                    videoMode={videoMode}
                    relation={getRelation(selectedUserId)}
                    friendBusy={friendBusyId === selectedUserId}
                    onSendFriend={() => void sendFriendRequest(selectedUserId)}
                    onCancelFriend={() => void cancelFriendRequest(selectedUserId)}
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
                    hasVideo={p.userId === user?.id ? hasLocalVideo : peersWithVideo.has(p.userId)}
                    isAdmin={p.userId === adminUserId}
                    isLocalUser={p.userId === user?.id}
                    relation={getRelation(p.userId)}
                    friendBusy={friendBusyId === p.userId}
                    onClick={() => handleParticipantClick(p.userId)}
                    onSendFriend={() => void sendFriendRequest(p.userId)}
                    onCancelFriend={() => void cancelFriendRequest(p.userId)}
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
                  hasVideo={p.userId === user?.id ? hasLocalVideo : peersWithVideo.has(p.userId)}
                  isLocalUser={p.userId === user?.id}
                  isAdmin={adminUserId === p.userId}
                  canKick={isAdmin && p.userId !== user?.id}
                  relation={getRelation(p.userId)}
                  friendBusy={friendBusyId === p.userId}
                  onKick={() => kickUser(p.userId)}
                  onClick={() => handleParticipantClick(p.userId)}
                  onSendFriend={() => void sendFriendRequest(p.userId)}
                  onCancelFriend={() => void cancelFriendRequest(p.userId)}
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
          active={videoMode === "camera"}
          title={videoMode === "camera" ? "Disable camera" : "Enable camera"}
          activeClass="bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-600/30"
          inactiveClass="bg-zinc-800 hover:bg-zinc-700"
        >
          {videoMode === "camera" ? <Video size={20} /> : <VideoOff size={20} />}
        </ControlBtn>

        <ControlBtn
          onClick={toggleScreenShare}
          active={videoMode === "screen"}
          title={videoMode === "screen" ? "Stop sharing" : "Share screen"}
          activeClass="bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-600/30"
          inactiveClass="bg-zinc-800 hover:bg-zinc-700"
        >
          {videoMode === "screen" ? <ScreenShareOff size={20} /> : <ScreenShare size={20} />}
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

function SelectedParticipantView({
  userId, participant, isLocalUser,
  localVideoStream, remoteVideoStreams,
  remoteVideoTick, peersWithVideo, hasLocalVideo, videoMode,
  relation, friendBusy, onSendFriend, onCancelFriend,
}: {
  userId: string;
  participant: Participant;
  isLocalUser: boolean;
  localVideoStream: React.MutableRefObject<MediaStream | null>;
  remoteVideoStreams: React.MutableRefObject<Map<string, MediaStream>>;
  remoteVideoTick: number;
  peersWithVideo: Set<string>;
  hasLocalVideo: boolean;
  videoMode: VideoMode;
  relation: FriendRelation;
  friendBusy: boolean;
  onSendFriend: () => void;
  onCancelFriend: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const hasVideo = isLocalUser ? hasLocalVideo : peersWithVideo.has(userId);
  const stream = isLocalUser
    ? localVideoStream.current
    : remoteVideoStreams.current.get(userId);
  // Screen share (and future whiteboard/youtube) looks better letterboxed than cropped.
  const objectFitClass = isLocalUser && videoMode === "screen" ? "object-contain" : "object-cover";

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
      <div className="w-full max-w-2xl flex flex-col gap-3">
        <div className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/80 shadow-2xl shadow-black/40">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocalUser}
            className={`w-full aspect-video bg-black ${objectFitClass}`}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 via-black/30 to-transparent px-5 py-4">
            <p className="text-white font-semibold">{participant.name}</p>
            {isLocalUser && (
              <p className="text-zinc-400 text-xs mt-0.5">
                {videoMode === "screen" ? "Sharing screen" : "You"}
              </p>
            )}
          </div>
        </div>
        {!isLocalUser && (
          <div className="flex justify-center">
            <FriendActionButton
              relation={relation}
              busy={friendBusy}
              size="md"
              onSend={onSendFriend}
              onCancel={onCancelFriend}
            />
          </div>
        )}
      </div>
    );
  }

  // No outbound/inbound video — show portrait
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
      {!isLocalUser && (
        <FriendActionButton
          relation={relation}
          busy={friendBusy}
          size="md"
          onSend={onSendFriend}
          onCancel={onCancelFriend}
        />
      )}
      <span className="inline-flex items-center gap-2 text-zinc-500 text-sm bg-zinc-900/60 border border-zinc-800 px-3 py-1.5 rounded-full">
        <VideoOff size={13} />
        Video is off
      </span>
    </div>
  );
}

/**
 * Compact avatar shown in the horizontal strip at the bottom of the focused view.
 * Violet outline = currently selected. Camera icon badge = has video active.
 */
function ParticipantStrip({
  participant, isSelected, isAdmin, hasVideo, isLocalUser,
  relation, friendBusy, onClick, onSendFriend, onCancelFriend,
}: {
  participant: Participant;
  isSelected: boolean;
  hasVideo: boolean;
  isAdmin: boolean;
  isLocalUser: boolean;
  relation: FriendRelation;
  friendBusy: boolean;
  onClick: () => void;
  onSendFriend: () => void;
  onCancelFriend: () => void;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all shrink-0 border ${
        isSelected
          ? "bg-violet-600/20 border-violet-600/40"
          : "border-transparent hover:bg-zinc-800/60"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="relative cursor-pointer"
        title={`Focus ${participant.name}`}
      >
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
        {isAdmin && (
          <span className="absolute bottom-0.5 left-0.5 w-5 h-5 rounded-full bg-green-500 border-2 border-zinc-950 flex items-center justify-center">
            <ShieldCheck size={9} className="text-zinc-950" />
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={onClick}
        className="text-[11px] text-zinc-400 max-w-14 truncate cursor-pointer"
      >
        {participant.name}
      </button>
      {!isLocalUser && (
        <FriendActionButton
          relation={relation}
          busy={friendBusy}
          size="xs"
          onSend={onSendFriend}
          onCancel={onCancelFriend}
        />
      )}
    </div>
  );
}

/**
 * Participant card in the default grid view.
 * Camera badge on top-right corner when the peer has video active.
 */
function ParticipantCard({
  participant,
  hasVideo,
  isLocalUser,
  isAdmin,
  canKick,
  relation,
  friendBusy,
  onKick,
  onClick,
  onSendFriend,
  onCancelFriend,
}: {
  participant: Participant;
  hasVideo: boolean;
  isLocalUser: boolean;
  isAdmin: boolean;
  canKick: boolean;
  relation: FriendRelation;
  friendBusy: boolean;
  onKick: () => void;
  onClick: () => void;
  onSendFriend: () => void;
  onCancelFriend: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 group relative w-28">
      <button
        type="button"
        onClick={onClick}
        className="relative cursor-pointer"
        title={`Focus ${participant.name}`}
      >
        <div className="absolute -inset-1 rounded-full bg-violet-600/0 group-hover:bg-violet-600/20 transition-all duration-300 blur-sm" />
        <img
          src={participant.imageUrl}
          alt={participant.name}
          className="relative w-20 h-20 rounded-full object-cover border-2 border-zinc-700 group-hover:border-violet-600/60 transition-colors duration-300"
        />
        <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-zinc-950" />
        {hasVideo && (
          <span className="absolute top-0 right-0 w-5 h-5 rounded-full bg-violet-600 border-2 border-zinc-950 flex items-center justify-center">
            <Video size={9} className="text-white" />
          </span>
        )}
        {isAdmin && (
          <span className="absolute bottom-0.5 left-0.5 w-5 h-5 rounded-full bg-green-500 border-2 border-zinc-950 flex items-center justify-center">
            <ShieldCheck size={9} className="text-zinc-950" />
          </span>
        )}
      </button>

      <div className="text-center w-full">
        <button
          type="button"
          onClick={onClick}
          className="text-sm text-zinc-300 font-medium max-w-full truncate block mx-auto cursor-pointer"
        >
          {participant.name}
        </button>
        {isLocalUser && <p className="text-[10px] text-zinc-600 mt-0.5">You</p>}
        {isAdmin && !isLocalUser && <p className="text-[10px] text-amber-500 mt-0.5">Admin</p>}
      </div>

      {!isLocalUser && (
        <FriendActionButton
          relation={relation}
          busy={friendBusy}
          size="sm"
          onSend={onSendFriend}
          onCancel={onCancelFriend}
        />
      )}

      {canKick && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onKick(); }}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
          title="Remove from room"
        >
          <UserX size={10} />
        </button>
      )}
    </div>
  );
}

/** Shared send / cancel / friends control used by card, strip, and focus view. */
function FriendActionButton({
  relation,
  busy,
  size,
  onSend,
  onCancel,
}: {
  relation: FriendRelation;
  busy: boolean;
  size: "xs" | "sm" | "md";
  onSend: () => void;
  onCancel: () => void;
}) {
  const sizeClass =
    size === "xs"
      ? "h-6 px-1.5 text-[10px] gap-0.5 rounded-md"
      : size === "sm"
        ? "h-7 px-2.5 text-[11px] gap-1 rounded-lg"
        : "h-9 px-3.5 text-xs gap-1.5 rounded-xl";

  const iconSize = size === "xs" ? 10 : size === "sm" ? 12 : 14;

  if (relation.status === "friends") {
    return (
      <span
        className={`inline-flex items-center justify-center font-medium text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/25 ${sizeClass}`}
        title="Friends"
      >
        <UserCheck size={iconSize} />
        {size !== "xs" && "Friends"}
      </span>
    );
  }

  if (relation.status === "pending_in") {
    return (
      <span
        className={`inline-flex items-center justify-center font-medium text-amber-300/90 bg-amber-500/10 border border-amber-500/25 ${sizeClass}`}
        title="Incoming request — respond in Network"
      >
        <UserRoundPlus size={iconSize} />
        {size !== "xs" && "Pending"}
      </span>
    );
  }

  if (relation.status === "pending_out") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onCancel();
        }}
        title="Cancel friend request"
        className={`inline-flex items-center justify-center font-medium transition-colors cursor-pointer disabled:opacity-60
          text-zinc-300 bg-zinc-800/80 border border-zinc-700 hover:bg-red-500/15 hover:text-red-300 hover:border-red-500/40
          ${sizeClass}`}
      >
        {busy ? <Loader2 size={iconSize} className="animate-spin" /> : <UserMinus size={iconSize} />}
        {size === "xs" ? (busy ? "" : "Undo") : busy ? "Cancelling…" : "Cancel request"}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onSend();
      }}
      title="Send friend request"
      className={`inline-flex items-center justify-center font-medium transition-colors cursor-pointer disabled:opacity-60
        text-violet-200 bg-violet-600/20 border border-violet-500/35 hover:bg-violet-600/35 hover:border-violet-400/50
        ${sizeClass}`}
    >
      {busy ? <Loader2 size={iconSize} className="animate-spin" /> : <UserRoundPlus size={iconSize} />}
      {size === "xs" ? (busy ? "" : "Add") : busy ? "Sending…" : "Add friend"}
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
