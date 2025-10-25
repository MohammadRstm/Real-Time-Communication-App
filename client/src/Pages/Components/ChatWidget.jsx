import axios from "axios";
import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import displayError from "../../utils/displayError";
import { MessageSquare } from "lucide-react";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export function ChatWidget({ showAlert }) {
  const [friends, setFriends] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [currentMessage, setCurrentMessage] = useState("");
  const [open, setOpen] = useState(false);

  const HubConnection = useRef(null);
  const messageContainerRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);

  const getToken = () => localStorage.getItem("token");

  // Handle scroll events to determine if we should auto-scroll
  const handleScroll = () => {
    const container = messageContainerRef.current;
    if (!container) return;

    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 50;

    shouldAutoScrollRef.current = isAtBottom;
  };

  // Auto-scroll only when new messages arrive and user is at bottom
  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;

    const container = messageContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // Scroll to bottom when opening chat or selecting a friend
  useEffect(() => {
    const container = messageContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
      shouldAutoScrollRef.current = true;
    }
  }, [selectedFriend, open]);

  // Initialize SignalR
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${BASE_URL}/chatHub`, {
        accessTokenFactory: () => token,
        transport: signalR.HttpTransportType.WebSockets,
        skipNegotiation: true,
      })
      .withAutomaticReconnect()
      .build();

    connection
      .start()
      .then(() => console.log("Connected to chat hub"))
      .catch((err) => console.error("Connection failed:", err));

    connection.on("ReceiveMessage", (messageObj) => {
      if (
        selectedFriend &&
        (messageObj.senderId === selectedFriend.id ||
          messageObj.receiverId === selectedFriend.id)
      ) {
        setMessages((prev) => [...prev, messageObj]);
      }
    });

    connection.on("Error", (errorMsg) => {
      console.error("SignalR error:", errorMsg);
    });

    HubConnection.current = connection;

    return () => {
      connection.stop();
    };
  }, [selectedFriend]);

  // Fetch messages when selecting a friend
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedFriend) return;
      
      const token = getToken();
      if (!token) return;

      try {
        const response = await axios.get(
          `${BASE_URL}/api/message/fetchAllMessages/${selectedFriend.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setMessages(response.data);
        shouldAutoScrollRef.current = true;
      } catch (err) {
        displayError(err, showAlert);
      }
    };
    fetchMessages();
  }, [selectedFriend]);

  // Fetch friends
  useEffect(() => {
    const fetchFriends = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const response = await axios.get(`${BASE_URL}/api/user/friends`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setFriends(response.data);
      } catch (err) {
        displayError(err, showAlert);
      }
    };
    fetchFriends();
  }, []);

  // Send message
  const sendMessage = async () => {
    if (!currentMessage.trim() || !selectedFriend) return;

    const token = getToken();
    if (!token) return;

    const messageText = currentMessage.trim();

    try {
      // Save message to database
    //   await axios.post(
    //     `${BASE_URL}/api/message/saveMessage/${selectedFriend.id}`,
    //     JSON.stringify(messageText),
    //     {
    //       headers: {
    //         Authorization: `Bearer ${token}`,
    //         "Content-Type": "application/json",
    //       },
    //     }
    //   );

      // Send via SignalR & save it
      if (HubConnection.current) {
        await HubConnection.current.invoke(
          "SendMessage",
          selectedFriend.id,
          messageText
        );
      }
      
      setCurrentMessage("");
      shouldAutoScrollRef.current = true;
    } catch (err) {
      displayError(err, showAlert);
    }
  };

  const handleBackToFriends = () => {
    setSelectedFriend(null);
    setMessages([]);
  };

  const handleCloseChat = () => {
    setSelectedFriend(null);
    setMessages([]);
    setOpen(false);
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 z-50"
        >
          <MessageSquare size={24} />
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-6 right-6 w-80 h-96 bg-white shadow-2xl rounded-2xl flex flex-col overflow-hidden border border-gray-200 animate-fadeIn z-50">
          {/* Header (sticky) */}
          <div className="bg-blue-600 text-white p-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {selectedFriend && (
                <button
                  onClick={handleBackToFriends}
                  className="text-white hover:text-gray-200 mr-2"
                >
                  ←
                </button>
              )}
              <p className="font-semibold">
                {selectedFriend ? selectedFriend.fullName : "Messages"}
              </p>
            </div>
            <button
              onClick={handleCloseChat}
              className="text-white text-lg font-bold hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          {/* Friend List */}
          {!selectedFriend && (
            <div className="flex-1 overflow-y-auto p-2">
              {friends.length > 0 ? (
                friends.map((friend, i) => (
                  <div
                    key={friend.id || i}
                    onClick={() => setSelectedFriend(friend)}
                    className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition"
                  >
                    <img
                      src={
                        friend.profile?.pictureUrl
                          ? `${BASE_URL}/uploads/${friend.profile.pictureUrl}`
                          : "/anonymousProfilePicture.png"
                      }
                      alt={friend.fullName}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        e.target.src = "/anonymousProfilePicture.png";
                      }}
                    />
                    <p className="font-medium">{friend.fullName}</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 mt-10">
                  No friends found...
                </p>
              )}
            </div>
          )}

          {/* Chat View */}
          {selectedFriend && (
            <div className="flex flex-col flex-1 min-h-0"> {/* Changed this line */}
              {/* Messages container */}
              <div
                className="flex-1 overflow-y-auto p-3 bg-gray-50 min-h-0" 
                ref={messageContainerRef}
                onScroll={handleScroll}
              >
                {messages.length > 0 ? (
                  messages.map((m, i) => {
                    const isSender = m.senderId !== selectedFriend.id;
                    return (
                      <div
                        key={m.id || i}
                        className={`flex mb-2 ${
                          isSender ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
                            isSender
                              ? "bg-blue-600 text-white rounded-br-none"
                              : "bg-gray-200 text-gray-900 rounded-bl-none"
                          }`}
                        >
                          <p>{m.message || m.text}</p>
                          <small className="text-xs opacity-70 block mt-1 text-right">
                            {new Date(m.sentAt || m.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </small>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-gray-400 mt-10">
                    No messages yet...
                  </p>
                )}
              </div>

              {/* Input Area - Now properly positioned */}
              <div className="p-2 border-t flex items-center gap-2 bg-white shrink-0"> {/* Added shrink-0 */}
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  className="flex-1 border border-gray-300 rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!currentMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-full text-sm transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}