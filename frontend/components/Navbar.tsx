"use client"
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'

import CreateRoomPopup from './CreateRoom'
import { useState } from 'react';
const Navbar = () => {
    const [popup, setpopup] = useState(false);
    const [userData, setUserData] = useState({
        email: "" as string | undefined,
        id: "",
        firstName: "" as string | undefined,
        fullName: "" as string | undefined,
        imageUrl: "",

    })
    function changePopup(){
        setpopup(pre => !pre)
    }
    return (
        <>
            <div className='bg-black'>
                <Show when="signed-out">
                    <SignInButton />
                    <SignUpButton>
                        <button className="bg-[#6c47ff] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
                            Sign Up
                        </button>
                    </SignUpButton>
                </Show>
                <Show when="signed-in">
                    <div className='w-full border-b-2 border-white flex justify-around'>
                        <button className='bg-gray-600 py-2 px-3 cursor-pointer rounded-sm' onClick={changePopup}>Create room</button>
                        {popup ? (<CreateRoomPopup popup={popup} setPopup={setpopup}/>): (<></>)}
                        <UserButton />
                        {/* <UserProfile/> */}
                    </div>
                </Show>
            </div>
        </>
    )
}

export default Navbar
