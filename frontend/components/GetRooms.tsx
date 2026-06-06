"use client"
import axios from 'axios';
import { useEffect, useState } from 'react'
import { toast } from 'sonner';
import RoomCard from './RoomCard';
const GetRooms = () => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
        const [rooms, setRooms] = useState<any[]>([])
     useEffect(() => {
        fetchRoomFunction()
    }, [])
    const fetchRoomFunction = async () => {
        try {
            const res = await axios.get(`${backendUrl}/api/room`);
            // console.log("response is: ", res.data.rooms)
            setRooms(res.data.rooms)
            if (res.data?.success) {
                toast.success("Room fetched successfully!");
            } else {
                toast.error("Something went wrong");
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.log(
                    "Response Data:",
                    error.response?.data
                );
                console.log("Full Response:", error.response);
                toast.error(
                    error.response?.data?.message ||
                    "Request failed"
                );
            } else {
                console.log(error);
                toast.error("Unknown error");
            }
        }
    }
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-zinc-950 h-screen px-32 py-12">
                    {rooms && rooms.map((room, idx) => (
                        // <div key={idx}>{typeof room === 'object' ? JSON.stringify(room) : String(room)}</div>
                        <div key={idx}><RoomCard room={room}/></div>
                    ))}
                </div>
    </div>
  )
}

export default GetRooms
