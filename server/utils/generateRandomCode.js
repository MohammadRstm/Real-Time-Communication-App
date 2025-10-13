function generateRoomCode(length = 6) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export async function createUniqueRoomId(RoomModel, length = 6) {
    let code;
    let exists = true;

    while (exists) {
        code = generateRoomCode(length);
        exists = await RoomModel.exists({ roomCode: code });
    }

    return code;
}
