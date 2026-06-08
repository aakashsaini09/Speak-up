"use client"
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'
import { socket } from "@/lib/socket";
const page = () => {
    useEffect(() => {
      socket.on("test-offer", () => {
        socket.emit("sending-offer")
      })
    }, [])
  return (
    <>
      <div className='w-screen h-screen flex justify-center items-center'>
        <Button className='cursor-pointer px-4 py-4'>Send audio</Button>
      </div>
    </>
  )
}

export default page
