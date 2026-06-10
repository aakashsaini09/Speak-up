"use client"
import { Button } from '@/components/ui/button'
import { socket } from '@/lib/socket';
import React, { useEffect, useRef } from 'react'
import type { Socket } from 'socket.io-client';

const page = () => {
    const pcRef = useRef(null);
    useEffect(() => {
        startReceiving(socket);
    }, []);
    function startReceiving(socket: Socket) {
        const video = document.createElement('video');
        document.body.appendChild(video);

        const pc = new RTCPeerConnection();
        const remoteStream =
  new MediaStream();

video.srcObject =
  remoteStream;

pc.ontrack =
  (event) => {
    event.streams[0]
      .getTracks()
      .forEach(track => {
        remoteStream.addTrack( track );
      });
  };

        socket.on("create-toffer", (message) => {
            console.log("Offer receiver: ", message)
            pc.setRemoteDescription(message.sdp).then(() => {
                pc.createAnswer().then(async (answer) => {
                    await pc.setLocalDescription(answer)
                    console.log("Sending answer: ", pc.localDescription)
                    socket.emit("create-tanswer", { sdp: pc.localDescription })
                })
            })
        })
        socket.on("ice-tcandidate", (message) => {
            pc.addIceCandidate(message.candidate)
        })
    }
    return (
        <>
            <div className='w-screen h-screen flex justify-center items-center'>
                {/* <Button className='cursor-pointer px-4 py-4'>receive audio</Button> */}
            </div>
        </>
    )
}

export default page
