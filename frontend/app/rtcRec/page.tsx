"use client"
import { Button } from '@/components/ui/button'
import { socket } from '@/lib/socket';
import { useEffect } from 'react'

const page = () => {
    useEffect(() => {
        let pc : RTCPeerConnection | null = null;
        pc = new RTCPeerConnection()
        socket.on("roffer", (message) => {
          console.log("Offer receiver: ", message)
             pc.setRemoteDescription(message.sdp).then(() => {
                 pc.createAnswer().then(async (answer) => {
                     await pc.setLocalDescription(answer)
                     console.log("Sending answer: ", pc.localDescription)
                     socket.emit("r-create-answer", { sdp: pc.localDescription })
                 })
             })
        })
        socket.on("ice-from-sender", (message) => {
            console.log("receiver got ice")
            pc.addIceCandidate(message.candidate)
        })
        pc.onicecandidate = ((event) => {
            if(event.candidate){
              socket.emit("ice-from-receiver", {candidate: event.candidate})
            }
        })
        pc.ontrack = (event) => {
            console.log("track: ", event)
            const video = document.createElement('video')
            document.body.appendChild(video)
            video.srcObject = new MediaStream([event.track])
            document.getElementById('play').addEventListener('click', () => {
                video.play()
            })
        };
    }, []);
    return (
        <>
            <div className='w-screen h-screen flex justify-center items-center'>
                <Button id='play'>Play</Button>
            </div>
        </>
    )
}

export default page
