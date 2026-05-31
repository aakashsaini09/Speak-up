"use client";

import { useEffect } from "react";
import { socket } from "@/lib/socket";
import { useParams } from "next/navigation";

export default function Page() {
  const id = useParams<{ id: string }>()
  // const { id } = useParams();

  useEffect(() => {
    socket.emit("join-room", {
      roomId: id,
    });

    socket.on(
      "room-message",
      (message) => {
        console.log(message);
      }
    );

    return () => {
      socket.off("room-message");
    };
  }, [id]);

  return <div>Room</div>;
}
