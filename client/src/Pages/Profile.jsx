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

  const [searchTerm, setSearchTerm] = useState("");
  const [friendToBlock, setFriendToBlock] = useState(null);

  const fetchUserInfo = async (token) => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const otherUserId = urlParams.get("id");
    if (otherUserId) setOtherUser(otherUserId);

    try {
      const endpoint = otherUserId
        ? `${BASE_URL}/api/user/getUserDetails/${otherUserId}`
        : `${BASE_URL}/api/user/getUserDetails`;

      const { data } = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

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
    if (!token) {
      showAlert("info", "Please login again, your token has expired");
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
    if (!token) {
      showAlert("info", "Please login again, your token has expired");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const { data } = await axios.post(
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
        photo_url: data.filePath,
      }));
      setUserInfo((prev) => ({
        ...prev,
        profile: { ...prev.profile, picture_url: data.filePath },
      }));
    } catch (err) {
      displayError(err, showAlert);
    }
  };

  const submitChanges = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      showAlert("info", "Please login again, your token has expired");
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
    if (!token) {
      showAlert("info", "Please login again, your token has expired");
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
      fetchUserInfo(token);
    } catch (err) {
      displayError(err, showAlert);
    }
  };

  const filteredFriends =
    userInfo?.friends?.filter((f) =>
      f.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  if (!userInfo)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center py-12 px-4">
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
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="relative bg-white rounded-2xl shadow-lg p-8 w-full max-w-3xl mt-8">
        {/* Floating Edit / Save Buttons */}
        {!otherUser && (
          <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
            {/* Edit icon */}
            <button
              onClick={() => setIsInEditMode(true)}
              className={`p-2 absolute -right-3 -top-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 shadow-md transform transition-all duration-300 ${
                isInEditMode
                  ? "translate-x-20 opacity-0 pointer-events-none"
                  : "translate-x-0 opacity-100"
              }`}
              title="Edit Profile"
            >
              <FiEdit2 className="text-lg" />
            </button>

            {/* Action buttons */}
            <div
              className={`flex items-center gap-2 transition-all duration-500 ${
                isInEditMode
                  ? "translate-x-0 opacity-100"
                  : "translate-x-20 opacity-0 pointer-events-none"
              }`}
            >
              <button
                onClick={submitChanges}
                className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <FiCheck /> Save
              </button>
              <button
                onClick={() => setIsInEditMode(false)}
                className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                <FiX /> Cancel
              </button>
              <button
                onClick={changeProfilePic}
                className="flex items-center gap-1 px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
              >
                <FiCamera /> Upload
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-8">
          {/* Profile Picture */}
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

            <div className="mt-4 text-center md:text-left">
              {isInEditMode ? (
                <input
                  name="fullName"
                  value={editProfileForm.fullName}
                  onChange={handleChange}
                  className="text-2xl font-bold border-b-2 border-gray-300 focus:border-indigo-600 outline-none w-full"
                />
              ) : (
                <h1 className="text-2xl font-bold text-gray-800">
                  {userInfo.fullName}
                </h1>
              )}
              <p className="text-gray-500 mt-1 break-all">{userInfo.email}</p>
            </div>
          </div>

          {/* Bio + Friends */}
          <div className="flex-1">
            {/* Bio */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">Bio</h2>
              {isInEditMode ? (
                <textarea
                  name="bio"
                  value={editProfileForm.bio}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                  rows="3"
                />
              ) : (
                <p className="text-gray-700">
                  {userInfo.profile?.bio ||
                    `Hello world, I'm ${userInfo.fullName}`}
                </p>
              )}
            </div>

            {/* Friends */}
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                Friends
              </h2>
              <div className="relative mb-4">
                <FiSearch className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search friends..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {filteredFriends.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {filteredFriends.map((friend, i) => (
                    <div
                      key={i}
                      className="relative flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-xl shadow-sm hover:shadow-md p-4 transition-all"
                    >
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

                      <img
                        src={
                          friend.profile?.pictureUrl
                            ? `${BASE_URL}/uploads/${friend.profile.pictureUrl}`
                            : "/anonymousProfilePicture.png"
                        }
                        alt={friend.fullName}
                        className="w-14 h-14 rounded-full object-cover cursor-pointer border border-gray-300"
                        onClick={() =>
                          (window.location.href = `/profile?id=${friend.id}`)
                        }
                      />

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800 truncate">
                          {friend.fullName}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {friend.email}
                        </p>
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
      </div>
    </div>
  );
}
