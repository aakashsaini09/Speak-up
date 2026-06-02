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
import { Button } from './ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react"
import axios from "axios"
import { toast, Toaster } from "sonner"
import { getToken, useUser } from "@clerk/nextjs"
interface roomTypes {
  title: string,
  language: string,
  maxUser: number
}
const CreateRoomPopup = ({ popup, setPopup }: { popup: boolean; setPopup: (open: boolean) => void }) => {
  const [roomData, setRoomData] = useState<roomTypes>({ title: "", language: "English", maxUser: 3 })
  function setDataFunction(e: React.ChangeEvent<HTMLInputElement>, value: string) {
    if (value === "title") {
      setRoomData((prev) => ({ ...prev, title: e.target.value }))
    } else if(value === "maxUser") {
      const parsed = parseInt(e.target.value, 10)
      setRoomData((prev) => ({ ...prev, maxUser: Number.isNaN(parsed) ? 3 : parsed }))
    }else{
      setRoomData((prev) => ({ ...prev, language: e.target.value}))
    }
  }
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
 const createRoomFunction = async () => {
  console.log("roomdata: ", roomData)
  if(roomData.title.length <=5){
    toast("Title is too short!!")
    return;
  }
  if(!roomData.language){
    setRoomData((prev) => ({ ...prev, language: 'English'}))
  }
  if(roomData.maxUser <= 0){
    setRoomData((prev) => ({ ...prev, maxUser: 3}))
  }
  try {
    const token = await getToken();
    const res = await axios.post(`${backendUrl}/api/room/create`, roomData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log("response is: ", res)
    if (res.data?.success) {
      toast.success("Room created successfully!");
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
}}
  return (
    <>
      <Dialog open={popup} onOpenChange={setPopup}>
        <form action="">
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-bold">Create your own room</DialogTitle>
              <DialogDescription>
                Gave a relevent title so users enter accordingly
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <Label htmlFor="title">Title</Label>
                <Input value={roomData?.title} onChange={(e) => setDataFunction(e, "title")} id="title" name="title" placeholder="English speaking practice room" />
              </Field>
              <Field>
              <Field>
                <Label htmlFor="maxUser">Maxuser</Label>
                <Input type="number" value={roomData?.maxUser} onChange={(e) => setDataFunction(e, "maxUser")} id="maxUser" name="maxUser" placeholder="Number of User can Join" />
              </Field>
                <Label htmlFor="language">Language</Label>

                <Select
                  value={roomData.language}
                  onValueChange={(value) =>
                    setRoomData((prev) => ({
                      ...prev,
                      language: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-45">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Hindi">Hindi</SelectItem>
                      <SelectItem value="Japanese">Japanese</SelectItem>
                      <SelectItem value="Tamil">Tamil</SelectItem>
                      <SelectItem value="Telugu">Telugu</SelectItem>
                      <SelectItem value="Marathi">Marathi</SelectItem>
                      <SelectItem value="Chinese">Chinese</SelectItem>
                      <SelectItem value="Korean">Korean</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                      <SelectItem value="Italian">Italian</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" className='cursor-pointer'>Cancel</Button>
              </DialogClose>
              <Button type="submit" className='cursor-pointer' onClick={createRoomFunction}>Create Room</Button>
            </DialogFooter>
          </DialogContent>
        </form>
      </Dialog>
    </>
  )
}

export default CreateRoomPopup
