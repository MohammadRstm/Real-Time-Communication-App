const mongoose = require('mongoose');
const { Schema , model } = mongoose;


const userSchema = new Schema({
    fullName : {type: String , required : true },
    email : {type : String , required : true},
    password : {type : String , required : true},
    friends : [{type : mongoose.Types.ObjectId , ref : 'User'}],
    friendRequests : [{
        from : {type : mongoose.Types.ObjectId },
        sentAt : {type: Date , default: Date.now}
    }]
}, {
    collection: 'Users'
});

module.exports = model("User" , userSchema)