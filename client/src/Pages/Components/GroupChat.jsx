import { Paperclip } from "lucide-react";
import axios from "axios";
import * as signalR from "@microsoft/signalr";
import { useRef } from "react";

const BASE_URL = import.meta.env.VITE_BASE_URL;

function GroupChat({ code, groupChatRef, messages, currentUserId }) {
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Upload file to server
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem('token');

      const response = await axios.post(`${BASE_URL}/api/room/upload`, formData, {
        headers: {
            Authorization : `Bearer ${token}`
        },
        "Content-Type": "multipart/form-data"
      });

      const fileUrl = response.data.fileUrl; // Example: { fileUrl: "https://server.com/uploads/file.pdf" }

      // Send as group chat message
      if (groupChatRef.current?.state === signalR.HubConnectionState.Connected) {
        await groupChatRef.current.invoke("SendGroupChatMessage", code, fileUrl);
      }
    } catch (err) {
      console.error("File upload failed:", err);
    } finally {
      e.target.value = ""; // reset input
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const input = e.target.elements.msg;
        const text = input.value.trim();

        if (text && groupChatRef.current?.state === signalR.HubConnectionState.Connected) {
          groupChatRef.current.invoke("SendGroupChatMessage", code, text).catch(console.error);
          input.value = "";
        }
      }}
      className="p-4 border-t border-gray-700 flex items-center space-x-2"
    >
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* File upload button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
        title="Attach file"
      >
        <Paperclip size={20} />
      </button>

      {/* Message input */}
      <input
        name="msg"
        placeholder="Type a message..."
        className="flex-1 bg-gray-700 rounded-lg px-3 py-2 focus:outline-none text-white"
      />

      {/* Send button */}
      <button
        type="submit"
        className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        Send
      </button>
    </form>
  );
}

export default GroupChat;
