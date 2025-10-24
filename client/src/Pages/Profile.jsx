import axios from "axios";
import { useEffect, useState } from "react";
import displayError from "../utils/displayError";
import { FiEdit2, FiCheck, FiX, FiCamera } from "react-icons/fi";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export function Profile({ showAlert }) {
  const [userInfo, setUserInfo] = useState(null);
  const [isInEditMode, setIsInEditMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const [otherUser , setOtherUser] = useState(null);

  const [editProfileForm, setEditProfileForm] = useState({
    bio: "",
    fullName: "",
    photo_url: "",
  });

   const fetchUserInfo = async (token) => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const otherUserId = urlParams.get('id');
    if(otherUserId) setOtherUser(otherUserId);
      try {
        let response;
        if(otherUserId){
        response = await axios.get(`${BASE_URL}/api/user/getUserDetails/${otherUserId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        }else{
        response = await axios.get(`${BASE_URL}/api/user/getUserDetails`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
    try {
      await axios.put(`${BASE_URL}/api/user/updateInfo`, editProfileForm, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      showAlert("success", "Profile updated successfully");

      fetchUserInfo(token);
      setIsInEditMode(false);
    } catch (err) {
      displayError(err, showAlert);
    }
  };

  if (!userInfo)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center py-10 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-3xl">
        <div className="flex flex-col items-center">
          {/* Profile Picture */}
          <div className="relative">
            <img
              src={userInfo.profile?.pictureUrl 
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

          {/* Name & Email */}
          <div className="mt-6 text-center">
            {isInEditMode ? (
              <input
                name="fullName"
                value={editProfileForm.fullName}
                onChange={handleChange}
                className="text-2xl font-bold text-center border-b-2 border-gray-300 focus:border-indigo-600 outline-none"
              />
            ) : (
              <h1 className="text-2xl font-bold text-gray-800">
                {userInfo.fullName}
              </h1>
            )}
            <p className="text-gray-500">{userInfo.email}</p>
          </div>

          {/* Bio Section */}
          <div className="mt-6 w-full">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              Bio
            </h2>
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
          <div className="mt-8 w-full">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              Friends
            </h2>
            {userInfo.friends && userInfo.friends.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {userInfo.friends.map((friend, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center bg-gray-50 p-3 rounded-xl shadow-sm hover:shadow-md transition"
                    onClick={() => window.location.href=`/profile?id=${friend.id}`}
                  >
                    <img
                      src={friend.profile?.pictureUrl 
                            ? `${BASE_URL}/uploads/${friend.profile.pictureUrl}`
                            : "/anonymousProfilePicture.png"
                        }
                      alt={friend.fullName}
                      className="w-16 h-16 rounded-full object-cover mb-2"
                    />
                    <p className="font-semibold text-sm">{friend.fullName}</p>
                    <p className="text-xs text-gray-500">{friend.email}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center">
                No friends yet. Search for friends...
              </p>
            )}
          </div>
          {!otherUser && (
            <>
             {/* Buttons */}
          <div className="mt-8 flex gap-4">
            {!isInEditMode ? (
              <button
                onClick={() => setIsInEditMode(true)}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                <FiEdit2 /> Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={submitChanges}
                  className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <FiCheck /> Save
                </button>
                <button
                  onClick={() => setIsInEditMode(false)}
                  className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  <FiX /> Cancel
                </button>
                <button
                  onClick={changeProfilePic}
                  className="flex items-center gap-2 px-5 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                >
                  <FiCamera /> Upload Photo
                </button>
              </>
            )}
          </div>
          </>
          )}
         
        </div>
      </div>
    </div>
  );
}
