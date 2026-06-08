"use client"
import { Button } from '@/components/ui/button'
import React from 'react'

const page = () => {
    return (
    <>
        <div className='w-screen h-screen flex justify-center items-center'>
            <Button className='cursor-pointer px-4 py-4'>receive audio</Button>
        </div>
    </>
    )
}

export default page
