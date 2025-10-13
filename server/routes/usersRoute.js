const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose');
const authenticateToken = require('../middlewares/auth');

const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;
const EXPIREY_TIME = '3h';

// LOGIN
router.post('/login' ,async (req , res) => {
    try{
        const {email , password} = req.body;
        // check if user exists
        const user = await User.findOne({email});
        if(!user) return res.status(404).json({message: "User not found"});
        // check password match
        const isMatch = await bcrypt.compare(password , user.password);
        if(!isMatch) return res.status(401).json({message: 'Wrong credentials'});
        // generate token
        const token = jwt.sign({
            id : user._id , email : user.email , fullName : user.fullName
        },JWT_SECRET,{
            expiresIn : EXPIREY_TIME
        });
        res.status(200).json({message : "Login Successfull" , token });
    }catch(err){
        res.status(500).json({message : 'Server error , please try again later' , err});
    }
});

// REGISTRATION
router.post('/signup' , async (req , res) => {
    try{
        const {fullName , email , password } = req.body;
        // check if user already exist
        const userAlreadyExits = await User.findOne({email});
        if(userAlreadyExits) res.status(401).json({message : "User already exits"});

        // hash password
        const hashed = await bcrypt.hash(password , SALT_ROUNDS);

        // create new user
        const newUser = new User({
            fullName,
            email,
            password : hashed
        });
        const savedUser = await newUser.save();
        res.status(200).json({message : 'User created successfully' , savedUser});
    }catch(err){
        res.status(500).json({message : "Server error"});
    }
});

// GETTING USER SUGGESTIONS LIST FOR SEARCH BAR
router.get("/suggestions/:searchString",authenticateToken,  async (req, res) => {
    try {
        const currentUser = req.user;
        const searchString = req.params.searchString.trim();

        if (!searchString) {
            return res.json([]); // return empty when input is empty
        }

        const users = await User.find({
            _id: {$ne :new mongoose.Types.ObjectId(currentUser.id)},
            fullName: { $regex: searchString, $options: "i" } 
        }).select("_id fullName email");

        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// SENDING FRIEND REQUESTS
router.post("/sendFreindRequest/:requestedUser" , authenticateToken , async(req , res) =>{
    try{
        const currentUser = req.user; // logged-in user
        const requestedUserId = req.params.requestedUser;
        // obect id type check

        // check if users are already friends
        const userData = await User.findById(currentUser.id).select("friends");
        if (userData.friends.some(f => f.toString() === requestedUserId)) {
            return res.status(400).json({ message: "You are already friends with this user" });
        }
        // Check if request already sent
        const targetUser = await User.findById(requestedUserId).select("friendRequests");
        if (targetUser.friendRequests.some(r => r.from.toString() === currentUser.id)) {
            return res.status(400).json({ message: "Friend request already sent" });
        }

        // Add friend request
        targetUser.friendRequests.push({ from: currentUser.id });
        await targetUser.save();

        // Notify via socket.io
        if (req.app.get("io")) {
            req.app.get("io").to(requestedUserId).emit("friend-request", {
                from: currentUser.id,
                fullName: currentUser.fullName
            });
        }

        res.status(200).json({message : 'Friend request sent'});
    }catch(err){
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// GETTING LIST OF FREIND REQUESTS
router.get('/friendRequests' , authenticateToken , async(req , res) =>{
    try{
        const currentUser = req.user;
        const user = await User.findById(currentUser.id);
        if(!user) res.status(404).json({message : 'User not found'});
        if(user.friendRequests?.length > 0 )
            return res.status(200).json(user.friendRequests);
        else
            return res.status(200).json([]);// empty array
    }catch(err){
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// ACCEPT A FRIEND REQUEST
router.post('/acceptFriendRequest/:request_id', authenticateToken, async(req, res) => {
    try {
        const requestId = req.params.request_id;
        const currentUser = req.user;
        const user = await User.findById(currentUser.id);
        if(!user) return res.status(404).json({message: 'User not found'});

        const requestIndex = user.friendRequests.findIndex(r => r.from.toString() === requestId);
        if(requestIndex === -1) return res.status(400).json({message: 'Friend request not found'});

        user.friendRequests.splice(requestIndex, 1); // remove from friendRequests
        user.friends.push(requestId); // add to friends
        await user.save();

        res.status(200).json({message: 'Friend request accepted'});
    } catch(err) {
        console.error(err);
        res.status(500).json({message: 'Server error'});
    }
});

// REJECT FRIEND REQUEST
router.post('/rejectFriendRequest/:request_id', authenticateToken, async(req, res) => {
    try {
        const requestId = req.params.request_id;
        const currentUser = req.user;
        const user = await User.findById(currentUser.id);
        if(!user) return res.status(404).json({message: 'User not found'});

        const requestIndex = user.friendRequests.findIndex(r => r.from.toString() === requestId);
        if(requestIndex === -1) return res.status(400).json({message: 'Friend request not found'});

        user.friendRequests.splice(requestIndex, 1); // remove from friendRequests
        await user.save();

        res.status(200).json({message: 'Friend request rejected'});
    } catch(err) {
        console.error(err);
        res.status(500).json({message: 'Server error'});
    }
});

// GET ALL FRIEDS FOR A USER
router.get('/friends' , authenticateToken , async (req , res) =>{
    try{
        const currentUser = req.user;
        const user = await User.findById(currentUser.id).select('friends').populate(
            {
                path: 'friends',
                select : 'fullName email _id'
            }
        );

        if(!user || !user.friends || user.friends.length === 0)
            return res.json([]);

        return res.json(user.friends);
    }catch(err){
        console.error(err);
        res.status(500).json({message: 'Server error'});
    }
});











module.exports = router;