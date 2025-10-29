import axios from "axios";
import { useEffect, useState } from "react";
import displayError from "../utils/displayError";
import { FiEdit2, FiCheck, FiX, FiCamera, FiSearch } from "react-icons/fi";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export function Profile({ showAlert }) {
  const [userInfo, setUserInfo] = useState(null);
  const [isInEditMode, setIsInEditMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [editProfileForm, setEditProfileForm] = useState({
    bio: "",
    fullName: "",
    photo_url: "",
  });

  // New states
  const [searchTerm, setSearchTerm] = useState("");
  const [friendToBlock, setFriendToBlock] = useState(null);

  const fetchUserInfo = async (token) => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const otherUserId = urlParams.get("id");
    if (otherUserId) setOtherUser(otherUserId);// access profile page of another user

    try {
      let response;
      if (otherUserId) {
        response = await axios.get(
          `${BASE_URL}/api/user/getUserDetails/${otherUserId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } else {
        response = await axios.get(`${BASE_URL}/api/user/getUserDetails`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const data = response.data;
      setUserInfo(data);
      setEditProfileForm({
        bio: data.profile?.bio || "",
        fullName: data.fullName || "",
        photo_url: data.profile?.pictureUrl || "",
      });
    } catch (err) {
      displayError(err, showAlert);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if(!token){
      showAlert("info" , "Please login again, your token has expired");
      return;
    }
    fetchUserInfo(token);
  }, []);

  const handleChange = (e) => {
    setEditProfileForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const changeProfilePic = async () => {
    if (!selectedFile) return showAlert("error", "Please select a file first");
    const token = localStorage.getItem("token");
    if(!token){
      showAlert("info" , "Please login again, your token has expired");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await axios.post(
        `${BASE_URL}/api/user/uploadProfilePhoto`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      showAlert("success", "Profile picture updated");
      setEditProfileForm((prev) => ({
        ...prev,
        photo_url: response.data.filePath,
      }));
      setUserInfo((prev) => ({
        ...prev,
        profile: { ...prev.profile, picture_url: response.data.filePath },
      }));
    } catch (err) {
      displayError(err, showAlert);
    }
  };

  const submitChanges = async () => {
    const token = localStorage.getItem("token");
    if(!token){
      showAlert("info" , "Please login again, your token has expired");
      return;
    }
    try {
      await axios.put(`${BASE_URL}/api/user/updateInfo`, editProfileForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showAlert("success", "Profile updated successfully");

      fetchUserInfo(token);
      setIsInEditMode(false);
    } catch (err) {
      displayError(err, showAlert);
    }
  };

  const handleBlockFriend = async () => {
    if (!friendToBlock) return;
    const token = localStorage.getItem("token");
    if(!token){
      showAlert("info" , "Please login again, your token has expired");
      return;
    }
    try {
      await axios.post(
        `${BASE_URL}/api/user/blockFriend/${friendToBlock.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showAlert("success", `${friendToBlock.fullName} has been blocked`);
      setFriendToBlock(null);
      fetchUserInfo(token); // refresh friends list
    } catch (err) {
      displayError(err, showAlert);
    }
  };

  const filteredFriends =
    userInfo?.friends?.filter((friend) =>
      friend.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  if (!userInfo)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center py-12 px-4 relative">
      {/* Block Confirmation Modal */}
      {friendToBlock && (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-80 text-center">
            <h3 className="text-lg font-semibold mb-4">
              Block {friendToBlock.fullName}?
            </h3>
            <p className="text-gray-600 mb-6">
              They will be removed from your friends list and blocked.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleBlockFriend}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
              >
                Confirm
              </button>
              <button
                onClick={() => setFriendToBlock(null)}
                className="bg-gray-300 text-gray-700 px-4- py-2 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-3xl relative mt-8">
        {/* Edit Profile Button - Top Right Corner */}
        {!otherUser && !isInEditMode && (
          <button
            onClick={() => setIsInEditMode(true)}
            className="absolute top-4 right-4 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition shadow-md"
            title="Edit Profile"
          >
            <FiEdit2 className="text-lg" />
          </button>
        )}

        <div className="flex flex-col md:flex-row gap-8">
          {/* Profile Picture Section - Left */}
          <div className="flex flex-col items-center md:items-start">
            <div className="relative">
              <img
                src={
                  userInfo.profile?.pictureUrl
                    ? `${BASE_URL}/uploads/${userInfo.profile.pictureUrl}`
                    : "/anonymousProfilePicture.png"
                }
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-indigo-500 shadow-md"
              />
              {isInEditMode && (
                <label className="absolute bottom-0 right-0 bg-indigo-600 p-2 rounded-full cursor-pointer hover:bg-indigo-700 transition">
                  <FiCamera className="text-white text-lg" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>

            {/* Name & Email - Below profile picture on mobile, to the right on desktop */}
            <div className="mt-4 text-center md:text-left">
              {isInEditMode ? (
                <input
                  name="fullName"
                  value={editProfileForm.fullName}
                  onChange={handleChange}
                  className="text-2xl font-bold text-center md:text-left border-b-2 border-gray-300 focus:border-indigo-600 outline-none w-full"
                />
              ) : (
                <h1 className="text-2xl font-bold text-gray-800">
                  {userInfo.fullName}
                </h1>
              )}
              <p className="text-gray-500 mt-1 break-all">{userInfo.email}</p>
            </div>
          </div>

          {/* Bio and Friends Section - Right */}
          <div className="flex-1">
            {/* Bio Section */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">Bio</h2>
              {isInEditMode ? (
                <textarea
                  name="bio"
                  value={editProfileForm.bio}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows="3"
                />
              ) : (
                <p className="text-gray-700">
                  {userInfo.profile?.bio ||
                    `Hello world, I'm ${userInfo.fullName}`}
                </p>
              )}
            </div>

            {/* Friends Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                Friends
              </h2>

              {/* Search Bar */}
              <div className="relative mb-4">
                <FiSearch className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search friends..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {filteredFriends.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFriends.map((friend, i) => (
                    <div
                      key={i}
                      className="relative bg-gray-50 p-4 rounded-xl shadow-sm hover:shadow-md transition min-h-[120px]"
                    >
                      {/* Block Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFriendToBlock(friend);
                        }}
                        title="Block"
                        className="absolute top-3 right-3 text-gray-400 hover:text-red-600 transition"
                      >
                        <FiX className="text-lg" />
                      </button>

                      <div className="flex items-center gap-3">
                        <img
                          src={
                            friend.profile?.pictureUrl
                              ? `${BASE_URL}/uploads/${friend.profile.pictureUrl}`
                              : "/anonymousProfilePicture.png"
                          }
                          alt={friend.fullName}
                          className="w-12 h-12 rounded-full object-cover cursor-pointer flex-shrink-0"
                          onClick={() =>
                            (window.location.href = `/profile?id=${friend.id}`)
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">
                            {friend.fullName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {friend.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No matching friends found.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Edit Mode Buttons */}
        {!otherUser && isInEditMode && (
          <div className="mt-8 flex flex-wrap gap-3 justify-center md:justify-start">
            <button
              onClick={submitChanges}
              className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <FiCheck /> Save
            </button>
            <button
              onClick={() => setIsInEditMode(false)}
              className="flex items-center gap-2 px-5- py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              <FiX /> Cancel
            </button>
            <button
              onClick={changeProfilePic}
              className="flex items-center gap-2 px-5 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
            >
              <FiCamera /> Upload Photo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}