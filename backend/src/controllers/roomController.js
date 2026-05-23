

export const createRoom = async (req, res) => {
    const room =
    await roomService.createRoom(req)

    res.json(room)
}