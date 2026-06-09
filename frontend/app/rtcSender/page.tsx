"use client"
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { socket } from "@/lib/socket";
const page = () => {
  const [pc, setPc] = useState<RTCPeerConnection | null>(null)
  const iniciateConnection = async() => {
    socket.on("create-toffer", async(message) => {
      // socket.emit("sending-offer")
      await pc.setRemoteDescription(message.sdp)
    })
    socket.on("create-tanswer", async (message) => {
    await pc.setRemoteDescription( message.sdp);
  }
);
    socket.on("ice-tcandidate", (ice) =>{
      pc.addIceCandidate(ice.candidate)
    })
    const pc = new RTCPeerConnection();
    setPc(pc);
    pc.onicecandidate = ((event) => {
      if(event.candidate){
        socket.emit("ice-tcandidate", {candidate: event.candidate})
      }
    })
    pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", { candidate: event.candidate });
    }
  };
    pc.onnegotiationneeded = async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("create-toffer", {sdp: pc.localDescription});
    }      
    getCameraStreamAndSend(pc);
  }
  const getCameraStreamAndSend = (pc: RTCPeerConnection) => {
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();
        // this is wrong, should propogate via a component
        document.body.appendChild(video);
        stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
        });
    });
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