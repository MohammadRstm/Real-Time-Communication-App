const express = require('express');
const authenticateToken = require('../middlewares/auth');
const router = express.Router();
const { createUniqueRoomId } = require("../utils/generateRandomCode");
const Room = require("../models/Room");


router.post('/create' , authenticateToken , async (req , res) =>{
    try{
        const currentUser = req.user;
        const roomLength = 6;
        const roomCode = await createUniqueRoomId(Room , roomLength);

        const newRoom = new Room({
            roomCode, 
            createdBy : currentUser.id
        });
        await newRoom.save();

        const roomLink = `http://localhost:5173/videoCalling/${roomCode}`;

        res.status(200).json({
            roomId : newRoom.roomCode,
            link : roomLink
        });
    }catch(err){
        console.log(err);
        res.status(500).json({message: "Server error"});
    }
});

router.post('/verify/:code' , authenticateToken , async (req, res) =>{
    try{
        const code = req.params.code;
        const room = await Room.findOne({roomCode : code});
        if(room)
            return res.json({exists : true});
        else
            return res.json({exists : false});
    }catch(err){
        console.log(err);
        res.status(500).json({message : 'Server error'});
    }
});








module.exports = router;