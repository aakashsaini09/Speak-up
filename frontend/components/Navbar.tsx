"use client"
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from 'react'
import { Button } from './ui/button'
const Navbar = () => {
    const [popup, setpopup] = useState(false);
    function changePopup(){
        setpopup(pre => !pre)
    }
    // console.log("userprofile data: ", UserProfile)
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
                        {popup ? (<Dialog open={popup} onOpenChange={setpopup}>
                            <form action="">
                                <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Make changes to your profile here. Click save when you&apos;re
              done.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <Label htmlFor="name-1">Name</Label>
              <Input id="name-1" name="name" defaultValue="Pedro Duarte" />
            </Field>
            <Field>
              <Label htmlFor="username-1">Username</Label>
              <Input id="username-1" name="username" defaultValue="@peduarte" />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </DialogContent>
                            </form>
</Dialog>): (<></>)}
                        <UserButton />
                        {/* <UserProfile/> */}
                    </div>
                </Show>
            </div>
        </>
    )
}

export default Navbar
