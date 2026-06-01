"use client";

import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function Page() {
  const {user} = useUser();
  const { id } = useParams();
  console.log("Id: ", id)
  const [participants, setParticipants] = useState([]);
  useEffect(() => {
      if (!id || !user?.id) return;
    const userAndRoomData = {
      roomId: id,
      userId: user?.id,
      name: user?.firstName,
      imageUrl: user?.imageUrl,
    };
    socket.emit("join-room", userAndRoomData);
    socket.on("participants-count", (count) => {
        console.log("Number of participats: ", count);
    });
    socket.on("participants-update", participantsdata => setParticipants(participantsdata) )
    console.log("participants: ", participants)
    socket.on("room-message", (message) => {
        console.log(message);
    });
    return () => {
      socket.off("room-message");
      socket.off("participants-count");
    };
  }, [id, user?.id]);

  return <div className="text-white"><div></div>
    Lorem ipsum dolor sit amet consectetur adipisicing elit. Minima voluptas veritatis autem quas. Culpa, maxime repudiandae! Nobis dolorum quis minus! Facere perferendis quibusdam delectus! Possimus numquam nesciunt placeat soluta vitae quas repellendus animi, quibusdam, autem qui quos deserunt quaerat blanditiis in et adipisci quam minima ducimus necessitatibus sunt architecto atque. Voluptas omnis enim voluptatum molestias reiciendis sit odio doloribus corporis pariatur consequatur, iure exercitationem perferendis repudiandae nulla dignissimos veritatis non iste itaque, voluptate magni assumenda earum rem eum facilis? Eveniet suscipit sapiente voluptas assumenda animi, libero quas quae, ex praesentium vel iure expedita doloribus porro. Atque, sit impedit. Esse molestiae doloribus, dolore eum eos, autem ipsum ipsam reprehenderit molestias non soluta odit. Impedit eligendi vero facere a accusantium quidem modi culpa ipsam reprehenderit amet quia possimus ut exercitationem deleniti pariatur, doloremque magnam. Odit ipsum ipsam inventore debitis asperiores praesentium sunt corrupti. Dicta ut quibusdam ducimus earum praesentium explicabo suscipit. Eligendi amet autem, incidunt quisquam deserunt at, delectus rerum, illum aliquam nulla minima veritatis labore. Repudiandae ab necessitatibus hic inventore ratione, ea quaerat molestias consectetur rerum cum sed vero? Accusantium consequatur autem dicta exercitationem explicabo. Ducimus porro dolore, veritatis ex id fugiat voluptatibus, a nulla voluptates sequi eaque error. Dolor tempora inventore repellat iste labore illo maiores molestias architecto modi totam. Facere doloribus quam id, voluptatem quisquam velit maiores illo sunt est. Voluptas, adipisci! Nulla odio ipsa animi nostrum sequi culpa neque quod, natus necessitatibus esse dolorem reprehenderit ad enim laboriosam dicta, numquam ut. Ea distinctio voluptatibus voluptate debitis amet fuga esse blanditiis necessitatibus animi aliquam nemo, est, delectus enim iure id corporis a eos dolorum perspiciatis veniam sit! Iste accusamus sed praesentium odit, tenetur ipsam quisquam! Quis dolores ad tempore vero. Corporis iusto, sunt beatae porro consequatur voluptatibus optio ex ullam, tempora iure similique itaque sit ab adipisci necessitatibus. Quod.</div>;
}
