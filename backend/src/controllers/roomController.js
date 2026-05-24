import { authentication } from "../services/authServices"

export const createRoom = async (req, res) => {
    const response = await authentication(req)

    res.json(room)
}