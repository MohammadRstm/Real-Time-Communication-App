const mongoose = require('mongoose');
const {Schema , model} = mongoose;


const roomSchema = new Schema({
    roomCode : {type:String , required : true , unique : true},
    createdBy : {type : mongoose.Types.ObjectId , ref : 'User'},
    createAt : {type : Date , default : Date.now}
},{
    collection : 'Rooms'
});


module.exports = model('Room' , roomSchema);