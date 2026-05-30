"use client"
import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner';

const HomePage = () => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
    const [rooms, setRooms] = useState([{
        activeParticipants: "",
        createdAt: "",
        creatorId:"",
        language:"",
        lastActiveAt:"",
        _id:"",
    }])
    useEffect(() => {
        fetchRoomFunction()
    }, [])
    const fetchRoomFunction = async () => {
        try {
            const res = await axios.get(`${backendUrl}/api/room`);
            console.log("response is: ", res.data.rooms)
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
        <>
        <div className='text-white'>
            {rooms.map((room) => {
                <div></div>
            })}
        </div>
        </>
    )
}

export default HomePage
