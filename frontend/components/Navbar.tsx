"use client"
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'

import CreateRoomPopup from './CreateRoom'
import { useState } from 'react';
import { MessageCircleCheck } from 'lucide-react';
import img from '@/public/bg.png'
import Image from 'next/image';
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
            <div className=''>
                <Show when="signed-out">
                    <div className='w-full py-5 flex items-center justify-between sm:px-11 md:px-28'>
                    {/* <Image src={img} className='bg-white' alt='Img not found' width={150}/> */}
                    <h1 className='font-bold sm:text-2xl md:text-3xl text-white capitalize cursor-pointer'><span className='text-[#7254e9] font-mono sm:text-3xl md:text-4xl'>S</span>peak up</h1>
                    <div className='flex gap-9 md:gap-14'>
                        <SignInButton>
                            <button className="bg-[#7254e9] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
                                Sign in
                            </button>
                        </SignInButton>
                        <SignUpButton>
                            <button className="bg-[#7254e9] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
                                Sign Up
                            </button>
                        </SignUpButton>
                    </div>
                    </div>
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
