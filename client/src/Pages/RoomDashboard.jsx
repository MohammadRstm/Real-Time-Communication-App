import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useState } from "react";
import { FiX } from "react-icons/fi";
import displayError from "../utils/displayError";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export function RoomDashboard({showAlert}) {
  const [createRoomModal, setCreateRoomModal] = useState(false);
  const [joinRoomModal, setJoinRoomModal] = useState(false);
  const [friends, setFriends] = useState([]);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [newRoomData, setNewRoomData] = useState(null);

  const token = localStorage.getItem("token");
  if (!token) window.location.href = "/login";
  const { id } = jwtDecode(token);

  const getAllFriends = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/user/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFriends(response.data.friends || response.data);
    } catch (err) {
      displayError(err , showAlert);
    }
  };

  const createRoom = async () => {
    try {
      const response = await axios.post(`${BASE_URL}/api/room/create`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNewRoomData(response.data);
      await getAllFriends();
      setCreateRoomModal(true);
      showAlert("success" , "Room created");
    } catch (err) {
      displayError(err , showAlert);
    }
  };

  const joinRoom = () => {
    if (!roomCodeInput.trim()) return alert("Enter a Room Code!");
    window.location.href = `/videoCalling/${roomCodeInput}`;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
      {/* GRID CONTAINER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full mt-10">
        {/* CREATE ROOM CARD */}
        <div className="bg-white p-6 rounded-xl shadow-md flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-4">Create Room</h2>
          <button
            onClick={createRoom}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
          >
            Create a Room
          </button>
        </div>

        {/* JOIN ROOM CARD */}
        <div className="bg-white p-6 rounded-xl shadow-md flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-4">Join Room</h2>
          <button
            onClick={() => setJoinRoomModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Join a Room
          </button>
        </div>
      </div>

      {/* CREATE ROOM MODAL */}
      {createRoomModal && newRoomData && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-[500px] p-6 relative">
            <button
              onClick={() => setCreateRoomModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <FiX size={20} />
            </button>

            <h2 className="text-lg font-semibold mb-2">Room Created</h2>
            <p className="text-gray-600"><strong>Room ID:</strong> {newRoomData.roomId}</p>
            <p className="text-gray-600 mb-4"><strong>Link:</strong> {newRoomData.link}</p>

            <h3 className="text-md font-semibold mb-2">Invite Friends</h3>

            {/* SCROLLABLE FRIEND LIST */}
            <div className="max-h-60 overflow-y-auto border rounded-md bg-gray-50 p-2">
              {friends.length > 0 ? (
                friends.map((friend, index) => (
                  <div key={index} className="flex justify-between items-center p-2 border-b last:border-none">
                    <div>{friend.fullName} — <span className="text-gray-500">{friend.email}</span></div>
                    <button className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                      Invite
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500">No Friends Found</p>
              )}
            </div>

            <button
              onClick={() => window.location.href = newRoomData.link}
              className="mt-4 w-full px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
            >
              Go to Room
            </button>
          </div>
        </div>
      )}

      {/* JOIN ROOM MODAL */}
      {joinRoomModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-[400px] p-6 relative">
            <button
              onClick={() => setJoinRoomModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <FiX size={20} />
            </button>

            <h2 className="text-lg font-semibold mb-4">Enter Room Code</h2>
            <input
              type="text"
              placeholder="Enter Code..."
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value)}
              className="w-full border px-3 py-2 rounded-md mb-4"
            />

            <button
              onClick={joinRoom}
              className="w-full px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Join
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
