"use client"
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { socket } from "@/lib/socket";
const page = () => {
  const [pc, setPc] = useState<RTCPeerConnection | null>(null)
  const iniciateConnection = async() => {
    socket.on("s-create-answer", async (message) => {
      console.log("Answer rec: ", message.sdp)
    await pc.setRemoteDescription( message.sdp);
  }
);
    socket.on("ice-from-receiver", (ice) =>{
      console.log("sender got ice: ", ice)
      pc.addIceCandidate(ice.candidate)
    })
    const pc = new RTCPeerConnection();
    setPc(pc);
    pc.onicecandidate = ((event) => {
      if(event.candidate){
        socket.emit("ice-from-sender", {candidate: event.candidate})
      }
    })
    pc.onnegotiationneeded = async () => {
      console.log("onnegotiationneeded")
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("create-toffer", {sdp: pc.localDescription});
    }      
    // getCameraStreamAndSend(pc);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    })
    pc.addTrack(stream.getVideoTracks()[0]);
  }
  return (
    <>
      <div className='w-screen h-screen flex justify-center items-center'>
        <Button onClick={iniciateConnection} className='cursor-pointer px-4 py-4'>Send audio</Button>
      </div>
    </>
  )
}
export default page