"use client"
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'

import CreateRoomPopup from './CreateRoom'
import { useState } from 'react';
import { MessageCircleCheck } from 'lucide-react';
type NavbarProps = {
    value: string
}
const Navbar = ({value}: NavbarProps) => {
    const [popup, setpopup] = useState(false);
    function changePopup(){
        setpopup(pre => !pre)
    }
    return (
        <>
            <div className='bg-black py-5'>
                <Show when="signed-out">
                    <SignInButton />
                    <SignUpButton>
                        <button className="bg-[#6c47ff] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
                            Sign Up
                        </button>
                    </SignUpButton>
                </Show>
                <Show when="signed-in">
                    <div className='w-full border-b-2 border-white flex justify-around py-5'>
                        {value == 'rooms' ? <button className='bg-amber-100 text-black py-2 px-3 cursor-pointer rounded-sm' onClick={changePopup}>Create room</button> : <><MessageCircleCheck></MessageCircleCheck></>}
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
