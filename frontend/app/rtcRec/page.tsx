"use client"
import { Button } from '@/components/ui/button'
import { socket } from '@/lib/socket';
import React, { useEffect } from 'react'
import type { Socket } from 'socket.io-client';

const page = () => {
    useEffect(() => {
        startReceiving(socket);
    }, []);
      function startReceiving(socket: Socket) {
        const video = document.createElement('video');
        document.body.appendChild(video);

        const pc = new RTCPeerConnection();
        pc.ontrack = (event) => {
            const remoteStream =
  new MediaStream();

    video.srcObject =
    remoteStream;
    pc.ontrack = (event) => { event.streams[0]
        .getTracks()
        .forEach(track => {
            remoteStream.addTrack(track);
        });
    };
    video.play();
    }

        socket.on("create-toffer", (message) =>{
            pc.setRemoteDescription(message.sdp).then(()=> {
                pc.createAnswer().then((answer) => {
                    pc.setLocalDescription(answer)
                    socket.send("create-tanswer", {sdp: answer})
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
