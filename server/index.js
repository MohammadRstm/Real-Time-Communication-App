const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { default: mongoose } = require("mongoose");
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // replace with frontend url later
    methods: ["GET", "POST"]
  }
});

// get routers
const userRouter = require("./routes/usersRoute");

// communication handlers
io.on("connection", socket => {
  console.log("User connected:", socket.id);

  // When a user joins a room
  socket.on("join-room", roomId => {
    // get current users before joining 
    const room = io.sockets.adapter.rooms.get(roomId);
    const users = room ? [...room] : [];

    // Send the current users to the newly joined client
    socket.emit("all-users", users);

    // join
    socket.join(roomId);
    socket.data.roomId = roomId;

    // Notify other users in the room
    socket.to(roomId).emit("user-joined", socket.id);
    console.log(`Socket ${socket.id} joined ${roomId}`);
  });

  // Handle WebRTC offer (What WebRTC relays)   
  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", {from: socket.id , offer});
  });

  // Handle WebRTC answer 
  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { from: socket.id , answer});
  });

  // Handle ICE candidates
  socket.on("ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate", { from: socket.id , candidate});
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      socket.to(roomId).emit("user-left", socket.id);
      console.log(`Socket ${socket.id} left ${roomId}`);
    }
  });
});
// mongo db connection 
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI , {useNewUrlParser : true , useUnifiedTopology: true})
        .then(() => console.log('MongoDb Connected'))
        .catch(err => console.log(err));

app.use('/api/users' , userRouter); 

const PORT = process.env.PORT;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
