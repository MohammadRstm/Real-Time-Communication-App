import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useState, useEffect } from "react";
import { FiSearch, FiVideo, FiX } from "react-icons/fi";
import { io } from "socket.io-client";
import displayError from "../utils/displayError";
import { ChatWidget } from "./Components/ChatWidget";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export function Dashboard({showAlert}) {
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [friendRequests, setFriendRequests] = useState([]);
  const [showFriendRequestModal, setShowFriendRequestModal] = useState(false);
  
  const token = localStorage.getItem("token");
  let decoded;
  if(token) decoded = jwtDecode(token);

  useEffect(() =>{
    if (!token) window.location.href = "/";
  } , []);

  const id = decoded.sub;
  const fullName = decoded.family_name;

  useEffect(() => {
    if(!token){
      showAlert("info" , "Please login again, your token has expired");
      return;
    } 
    const getFriendRequests = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/user/friendRequests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFriendRequests(response.data);
      } catch (err) {
        displayError(err , showAlert);
      }
    };
    getFriendRequests();
  }, []);

  const displaySuggestions = async () => {
    if(!token){
      showAlert("info" , "Please login again, your token has expired");
      return;
    } 
    if (!searchInput.trim()) return;
    try {
      const response = await axios.get(`${BASE_URL}/api/user/suggestions/${searchInput}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuggestedUsers(response.data);
    } catch (err) {
      displayError(err , showAlert);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      displaySuggestions();
    }
  };

  const sendFriendRequest = async (userId) => {
    if(!token){
      showAlert("info" , "Please login again, your token has expired");
      return;
    } 
    try {
      await axios.post(`${BASE_URL}/api/user/sendFreindRequest/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showAlert("success" , "Friend request sent");
    } catch (err) {
      displayError(err , showAlert);
    }
  };

  const acceptFriendRequest = async (requestId) => {
    if(!token){
      showAlert("info" , "Please login again, your token has expired");
      return;
    } 
    try {
      await axios.post(`${BASE_URL}/api/user/acceptFriendRequest/${requestId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFriendRequests((prev) => prev.filter(r => r.from !== requestId));
      showAlert("success" , "Friend request accepted");
    } catch (err) {
      displayError(err , showAlert);
    }
  };

  const rejectFriendRequest = async (requestId) => {
    if(!token){
      showAlert("info" , "Please login again, your token has expired");
      return;
    } 
    try {
      await axios.post(`${BASE_URL}/api/user/rejectFriendRequest/${requestId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFriendRequests((prev) => prev.filter(r => r.from !== requestId));
    } catch (err) {
      displayError(err , showAlert);
    }
  };


  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
      <ChatWidget showAlert={showAlert}/>

      <h1 className="text-2xl font-bold mb-6">Welcome, {fullName}</h1>

      <div className="flex flex-col md:flex-row gap-6 w-full max-w-6xl">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-6 w-full md:w-1/3">
          {/* SEARCH USERS CARD */}
          <div className="bg-white p-6 rounded-xl shadow-md w-full">
            <h2 className="text-lg font-semibold mb-4">Add New Friends</h2>
            <div className="flex items-center gap-2 border rounded-md px-3 py-2">
              <FiSearch className="text-gray-500" />
              <input
                type="text"
                placeholder="Search for friends..."
                className="w-full outline-none"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyPress}
              />
              <button
                onClick={displaySuggestions}
                className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Search
              </button>
            </div>

            {suggestedUsers.length > 0 && (
              <div className="mt-4 border rounded-md bg-gray-50 max-h-[180px] overflow-y-auto scrollbar-thin">
                {suggestedUsers.slice(0, 10).map((user, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-3 border-b last:border-none hover:bg-gray-100"
                  >
                    <div>{user.fullName} — <span className="text-gray-600">{user.email}</span></div>
                    <button
                      onClick={() => sendFriendRequest(user.id)}
                      className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                    >
                      Add Friend
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FRIEND REQUEST CARD */}
          <div className="bg-white p-6 rounded-xl shadow-md w-full relative">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Friend Requests</h2>
              {friendRequests.length > 0 && (
                <span className="bg-red-600 text-white rounded-full px-2 py-0.5 text-sm">
                  {friendRequests.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowFriendRequestModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Show Requests
            </button>
          </div>
        </div>

        {/* VIDEO CALL ROOM CARD */}
        <div className="bg-white p-6 rounded-xl shadow-md w-full md:w-2/3 flex flex-col justify-center items-center">
          <FiVideo className="text-4xl mb-3" />
          <h2 className="text-xl font-semibold mb-3">Join or Create a Video Room</h2>
          <button
            onClick={() => window.location.href = `/roomDashboard?creator_id=${id}`}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
          >
            Join or Create Room
          </button>
        </div>
      </div>

      {/* FRIEND REQUEST MODAL */}
      {showFriendRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-96 p-6 relative">
            <button
              onClick={() => setShowFriendRequestModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <FiX size={20} />
            </button>
            <h2 className="text-lg font-semibold mb-4">Friend Requests</h2>
            {friendRequests.length > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                {friendRequests.map((user, i) => (
                  <div key={i} className="flex justify-between items-center p-2 border-b last:border-none">
                    <div>{user.fullName} — <span className="text-gray-600">{user.email}</span></div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptFriendRequest(user.from)}
                        className="px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => rejectFriendRequest(user.from)}
                        className="px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500">No Friend Requests</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
