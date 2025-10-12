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


router.post('/login' ,async (req , res) => {
    try{
        const {fullName , email , password} = req.body.loginForm;

        // check if user exists
        const user = await User.findOne({email});
        if(!user) res.status(404).json({message: "User not found"});

        // check password match
        const isMatch = await bcrypt.compare(password , user.password);
        if(!isMatch) res.status(401).json({message: 'Wrong credentials'});

        // generate token
        const token = jwt.sign({
            id : user._id , email : user.email
        },JWT_SECRET ,{
            expiresIn : EXPIREY_TIME
        });

        res.status(200).json({message : "Login Successfull" , token });
    }catch(err){
        res.status(500).json({message : 'Server error , please try again later'});
    }
});

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








module.exports = router;