import { io } from "socket.io-client";

export const socket = io("http://localhost:5000", {// later add deployment url (I won't deploy this)
  autoConnect: true, // connects automatically
  transports: ["websocket"] // ensures stable connection
});