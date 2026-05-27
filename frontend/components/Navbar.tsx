"use client"
import { Show, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs'

import CreateRoomPopup from './CreateRoom'
import { useEffect, useReducer, useState } from 'react';
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
    const { isLoaded, isSignedIn, user } = useUser()
    if(user){
        useEffect(()=> {
            setUserData({
                email: user?.primaryEmailAddress?.emailAddress,
                id: user.id,
                firstName: user?.firstName ?? undefined,
                fullName: user?.fullName ?? undefined,
                imageUrl: user?.imageUrl
            })
            storeUserInfotoDb()
        }, [])
    }
    const storeUserInfotoDb = () => {

    }
    console.log("useUser data: ", userData)
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
