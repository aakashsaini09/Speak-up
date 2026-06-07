"use client"

import { useState } from 'react';
import Navbar from './Navbar';
import {
    ToggleGroup,
    ToggleGroupItem,
} from "@/components/ui/toggle-group"
import GetRooms from './GetRooms';
import WorldChat from './WorldChat';
const HomePage = () => {

    const [value, setValue] = useState<string>("rooms")

    return (
        <div>
            <Navbar value={value}/>
            {value == 'rooms' ? (
                <GetRooms/>
                ) : (
                    <WorldChat/>
                )}
                    <div className='fixed w-full flex bottom-2 justify-around'>
                <ToggleGroup variant="default" type="single" value={value} onValueChange={(value) => { if (value) setValue(value) }} defaultValue="rooms">
                    <ToggleGroupItem value="rooms" aria-label="Toggle all" className={`px-4 py-2 `}>
                        Rooms
                    </ToggleGroupItem>
                    <ToggleGroupItem value="chat" aria-label="Toggle missed" className={`px-4 py-2`}>
                        World-Chat
                    </ToggleGroupItem>
                </ToggleGroup>
            </div>
            
        </div>
    )
}

export default HomePage
