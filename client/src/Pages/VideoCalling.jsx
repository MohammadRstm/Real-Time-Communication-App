// VideoCalling.jsx
import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { useNavigate, useParams } from "react-router";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { FileTextIcon, MessageSquare } from "lucide-react";
import GroupChat from "./Components/GroupChat";
import { PhoneOff } from "lucide-react";
import { PenTool } from "lucide-react";
import DrawingCanvas from "./Components/DrawingCanvas";
import { ConsoleLogger } from "@microsoft/signalr/dist/esm/Utils";
import VideoContainer from "./Components/VideoContainer";



const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

const BASE_URL = import.meta.env.VITE_BASE_URL || "";

function tryGetUserIdFromLocalStorageOrToken() {
  try {
    // try common storage keys
    const rawUser = localStorage.getItem("user") || localStorage.getItem("currentUser");
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        if (parsed?.id) return parsed.id;
        if (parsed?._id) return parsed._id;
      } catch (e) {
        // rawUser might be a string id already
        if (typeof rawUser === "string" && rawUser.length > 5) return rawUser;
      }
    }

    // try to decode token (JWT) for sub/id/userId claim
    const token = localStorage.getItem("token");
    if (!token) return "";
    const payload = token.split(".")[1];
    if (!payload) return "";
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded?.id || decoded?.sub || decoded?.userId || "";
  } catch (err) {
    console.warn("Could not obtain userId from local storage or token", err);
    return "";
  }
}

export function VideoCalling() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [roomVerified, setRoomVerified] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [connectionId, setConnectionId] = useState(null);
  const [screenStream, setScreenStream] = useState(null);

  // side bar options
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // canvas
  const [showCanvas, setShowCanvas] = useState(false);
  const [remoteDrawData, setRemoteDrawData] = useState(null);
  const [canvasHistory , setCanvasHistory] = useState([]);


  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map()); // peerId -> RTCPeerConnection
  const pendingCandidatesRef = useRef(new Map()); // peerId -> [candidate...]
  const connectionRef = useRef(null); // SignalR HubConnection
  const groupChatRef = useRef(null); // Group Chat HubConnection
  const canvasDrawingRef = useRef(null);// Canvas Chat HubConnection

  const [messages , setMessages] = useState([]);
  const [currentUserId , setCurrentUserId] = useState(null);

  const setRemoteStreamFor = (peerId, stream) => {
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      if (stream) next.set(peerId, stream);
      else next.delete(peerId);
      return next;
    });
  };
  // Group chat signalr setup
  useEffect(() =>{
    const token = localStorage.getItem("token");
    if(!token) return;
    const payload = jwtDecode(token);
    setCurrentUserId(payload.sub);// used to decide message's side
    const connection = new signalR.HubConnectionBuilder()
          .withUrl(`${BASE_URL}/videoGroupChatHub`, {
            accessTokenFactory: () => token,
            transport: signalR.HttpTransportType.WebSockets,
            skipNegotiation: true,
          })
          .withAutomaticReconnect()
          .build();
    groupChatRef.current = connection;
    connection
      .start()
      .then(() => {
        console.log("Connected to group chat hub");
        connection.invoke("JoinRoom", code)
        .then(() => console.log("Joined room:", code))
        .catch(console.error);
      })
      .catch((err) => console.error("Group Chat Connection failed:", err));

    connection.on("VideoGroupChatMessage", (messageObj) => {
      setMessages((prev) => [...prev , messageObj]); 
    });

    connection.on("Error", (errorMsg) => {
      console.error("Group Chat error:", errorMsg);
    });

    return () => {
      connection.invoke("LeaveRoom", code).catch(() => {});
      connection.stop();
    };
  } , []);

  // Canvas connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if(!token) return;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${BASE_URL}/canvasHub`,{
        accessTokenFactory : () => token,
        transport: signalR.HttpTransportType.WebSockets,
        skipNegotiation: true,
      })
      .build();
    canvasDrawingRef.current = connection;

    connection.start().then(() =>{
      connection.invoke("JoinRoom" , code)
        .then(() => console.log("Canvas Room Joined"))
        .catch((err) => console.log("Canvas Join error :" , err));
      console.log("✅ CanvasHub connected")
    }).catch((err) => console.log("Canvas connection error" , err));

    // Listen for incoming drawing data
    connection.on("ReceiveCanvasData", (data) => {
      setRemoteDrawData(data); 
    });

    connection.on("Error", (errorMsg) => {
      console.error("Canvas Drawing error:", errorMsg);
    });

    return () => {
      connection.invoke("LeaveRoom" , code).catch(() => {});
      connection.stop();
    };
  }, []);

  // if this load is a *page reload*, redirect to dashboard
  useEffect(() => {
    if(localStorage.getItem("justLoggedIn")){
      localStorage.removeItem("justLoggedIn");
      return;
    } 
    try {
      const navEntries = performance.getEntriesByType && performance.getEntriesByType("navigation");
      const nav = navEntries && navEntries[0];
      if (nav && nav.type === "reload") {
        console.log("Page reload detected — redirecting to room dashboard to avoid rejoining call");
        navigate("/roomDashboard");
        return;
      }
      // fallback for older browsers
      if (performance.navigation && performance.navigation.type === 1) {
        navigate("/roomDashboard");
        return;
      }
    } catch (e) {
      // ignore and proceed normally
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Register before unload to try to notify the server(best effort)
  useEffect(() => {
    const onBeforeUnload = (e) => {
      try {
        // Best effort: call LeaveRoom (no await) then allow unload
        const connection = connectionRef.current;
        if (connection?.state === 1) { // Connected state
          try {
            connection.invoke("LeaveRoom", code).catch(() => {});
          } catch(e) {}
        }
      } catch (err) {}
      // no custom message supported by most browsers anyway
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [code]);

  // Verify room
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return window.location.href = "/";

    const verifyRoom = async () => {
      try {
        const { data } = await axios.post(
          `${BASE_URL}/api/room/verify/${code}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!data.exists) {
          alert("Room doesn't exist");
          return setTimeout(() => navigate("/"), 2000);
        }
        setRoomVerified(true);
      } catch (err) {
        alert(err.response?.data?.message || err.message || "Server error");
      }
    };
    verifyRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Local video setup
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Main WebRTC + SignalR logic
  useEffect(() => {
    if (!roomVerified) return;
    let unmounted = false;

    const startLocalStreamAndConnect = async () => {
      // 1) try get local stream
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        console.log("✅ Got local stream with tracks:", stream.getTracks().map(t => t.kind));
      } catch (err) {
        console.error("Camera access failed, trying audio only...", err);
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          localStreamRef.current = audioOnly;
          setLocalStream(audioOnly);
          console.log("✅ Joined with audio only");
        } catch (audioErr) {
          console.error("Audio also failed, joining without media", audioErr);
          localStreamRef.current = null;
        }
      }

      if (unmounted) return;

      // 2) create SignalR connection
      const token = localStorage.getItem("token") || "";
      const userId = tryGetUserIdFromLocalStorageOrToken();

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(`${BASE_URL}/videoHub${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`, {
          accessTokenFactory: () => token || "",
          withCredentials : true
        })
        .withAutomaticReconnect() // default reconnect behavior
        .configureLogging(signalR.LogLevel.Information)
        .build();

      connectionRef.current = connection;

      // --- Incoming handlers from server (hub) ---
      const onAllUsers = (users) => {
        console.log("All users in room:", users);
        users.forEach(peerId => {
          if (peerId !== connection.connectionId) {
            createPeerConnection(peerId , true);// we send offers to existing users
          }
        });
      };

      const onUserJoined = (peerId) => {
        console.log("User joined:", peerId);
        if (peerId !== connection.connectionId) {
          createPeerConnection(peerId , false);// we only receive the offer , not send it
        }
      };

      const onOffer = async (payload) => {
        // payload expected: { from: <id>, offer: <RTCSessionDescriptionInit> }
        const { from, offer } = payload || {};
        console.log("📨 Received offer from:", from);
        const pc = getOrCreatePeer(from);
        if (!pc) return;

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          console.log("✅ Set remote description for offer");

          // process pending candidates for this peer (if any)
          const pending = pendingCandidatesRef.current.get(from);
          if (pending && pending.length) {
            pending.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.warn));
            pendingCandidatesRef.current.delete(from);
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log("📤 Sending answer to:", from);

          // Invoke server method (SendAnswer(answer, to))
          await connection.invoke("SendAnswer", pc.localDescription, from);
        } catch (err) {
          console.error("❌ Error handling offer:", err);
        }
      };

      const onAnswer = async (payload) => {
        const { from, answer } = payload || {};
        console.log("📨 Received answer from:", from);
        const pc = peersRef.current.get(from);
        if (!pc) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          console.log("✅ Set remote description for answer");

          // process pending candidates for this peer (if any)
          const pending = pendingCandidatesRef.current.get(from);
          if (pending && pending.length) {
            pending.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.warn));
            pendingCandidatesRef.current.delete(from);
          }

        } catch (err) {
          console.error("❌ Error handling answer:", err);
        }
      };

      const onIceCandidate = async (payload) => {
        const { from, candidate } = payload || {};
        const pc = peersRef.current.get(from);
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("✅ Added ICE candidate from:", from);
          } catch (err) {
            console.warn("Failed to add ICE candidate, storing for later:", err);
            if (!pendingCandidatesRef.current.has(from)) {
              pendingCandidatesRef.current.set(from, []);
            }
            pendingCandidatesRef.current.get(from).push(candidate);
          }
        } else {
          // no pc yet => store
          if (!pendingCandidatesRef.current.has(from)) {
            pendingCandidatesRef.current.set(from, []);
          }
          pendingCandidatesRef.current.get(from).push(candidate);
        }
      };

      const onUserLeft = (peerId) => {
        console.log("User left:", peerId);
        const pc = peersRef.current.get(peerId);
        if (pc) {
          pc.close();
          peersRef.current.delete(peerId);
        }
        pendingCandidatesRef.current.delete(peerId);
        setRemoteStreamFor(peerId, null);
      };

      // Register handlers
      connection.on("all-users", onAllUsers);
      connection.on("user-joined", onUserJoined);
      connection.on("offer", onOffer);
      connection.on("answer", onAnswer);
      connection.on("ice-candidate", onIceCandidate);
      connection.on("user-left", onUserLeft);

      // connection lifecycle handlers
      connection.onreconnecting((err) => {
        console.warn("SignalR reconnecting...", err?.message);
      });

      connection.onreconnected(async (newConnectionId) => {
        console.log("SignalR reconnected, new connectionId:", newConnectionId);
        setConnectionId(newConnectionId);
        // re-join room so server can re-send all-users
        try {
          await connection.invoke("JoinRoom", code);
        } catch (e) {
          console.warn("Failed to rejoin room after reconnect:", e);
        }
      });

      connection.onclose((err) => {
        console.log("SignalR connection closed", err);
        setConnectionId(null);
      });

      try {
        await connection.start();
        console.log("SignalR connected. connectionId:", connection.connectionId);
        setConnectionId(connection.connectionId);

        // Join room (server will respond with "all-users")
        await connection.invoke("JoinRoom", code);
      } catch (err) {
        console.error("SignalR start failed:", err);
      }
    }; // end startLocalStreamAndConnect

    startLocalStreamAndConnect();

    // cleanup on unmount
    return () => {
      unmounted = true;
      (async () => {
        console.log("🧹 Cleaning up...");
        // tell server we are leaving(best effort)
        try { 
          await leaveRoom();
        } catch (e) {
          /* ignore */
        }
        // stop local tracks
        if (localStreamRef.current) {
          try {
            localStreamRef.current.getTracks().forEach(track => track.stop());
          } catch (e) { /* ignore */ }
        }

        // close pcs
        peersRef.current.forEach((pc) => {
          try { pc.close(); } catch (e) { /* ignore */ }
        });
        peersRef.current.clear();
        pendingCandidatesRef.current.clear();

        // clear remote streams state
        setRemoteStreams(new Map());

        // stop connection
        if (connectionRef.current) {
          try {
            // remove listeners
            connectionRef.current.off("all-users");
            connectionRef.current.off("user-joined");
            connectionRef.current.off("offer");
            connectionRef.current.off("answer");
            connectionRef.current.off("ice-candidate");
            connectionRef.current.off("user-left");

            await connectionRef.current.stop();
            await connectionRef.current.dispose();
            connectionRef.current = null;
          } catch (e) {
            console.warn("Error stopping SignalR connection:", e);
          }
        }
      })();
      // delete page code 
      const deleteVideoCode = async() =>{
        const token = localStorage.getItem('token');
        try{
          await axios.delete(`${BASE_URL}/api/room/deleteRoom/${code}` , {
            headers:{
              Authorization:`Bearer ${token}`
            }
          });
        }catch(err){
          return;
        };
      };
      deleteVideoCode();
    };
  }, [roomVerified, code]);
  // clone stream to gurantee local stream appearing

  // Helper to create or return existing peer
  const getOrCreatePeer = (peerId) => {
    const connection = connectionRef.current;
    if (!connection) {
      console.warn("No SignalR connection yet.");
    }
    if (!peerId || peerId === connection?.connectionId) return null;

    let pc = peersRef.current.get(peerId);
    if (pc) return pc;

    console.log(`🔄 Creating new peer connection to: ${peerId}`);
    pc = new RTCPeerConnection(RTC_CONFIG);
    peersRef.current.set(peerId, pc);

    // Create a remote MediaStream and store in state
    const remoteStream = new MediaStream();
    setRemoteStreamFor(peerId, remoteStream);

    // ontrack
    pc.ontrack = (event) => {
      console.log(`🎯 Received ${event.track.kind} track from ${peerId}`);
      if (!remoteStream.getTracks().some(t => t.id === event.track.id)) {
        remoteStream.addTrack(event.track);
        console.log(`✅ Added ${event.track.kind} track. Stream now has:`, {
          video: remoteStream.getVideoTracks().length,
          audio: remoteStream.getAudioTracks().length
        });
      }
    };

    // ICE candidate -> send to server
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // server method expects (candidate, to)
        try {
          connection?.invoke("SendIceCandidate", event.candidate, peerId)
            .catch(e => console.warn("SendIceCandidate failed:", e));
        } catch (e) {
          console.warn("Could not invoke SendIceCandidate:", e);
        }
      }
    };

    // Connection state
    pc.onconnectionstatechange = () => {
      console.log(`🔗 ${peerId} connection state: ${pc.connectionState}`);
      if (pc.connectionState === "connected") {
        // Process pending candidates
        const pending = pendingCandidatesRef.current.get(peerId);
        if (pending) {
          pending.forEach(c => {
            pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.warn);
          });
          pendingCandidatesRef.current.delete(peerId);
        }
      }
    };

    // Add local tracks if exist
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        try {
          pc.addTrack(track, localStreamRef.current);
          console.log(`📤 Added local ${track.kind} track to ${peerId}`);
        } catch (e) {
          console.warn("addTrack failed:", e);
        }
      });
    }

    return pc;
  };

  // Helper to notify server we are leaving
  const leaveRoom = async () => {
    const connection = connectionRef.current;
    if (!connection || !code) return;
    try {
      // fire-and-forget LeaveRoom (server will broadcast user-left)
      connection.invoke("LeaveRoom", code).catch(e => console.warn("LeaveRoom invoke failed:", e));
    } catch (e) {
      console.warn("Error invoking LeaveRoom:", e);
    }
  };

  // Called when we need to create an offer to a peer
  const createPeerConnection = async (peerId , shouldCreateOffer = true) => {
    const connection = connectionRef.current;
    if (!connection) {
      console.warn("No SignalR connection available to send offer.");
      return;
    }
    console.log(`🤝 Creating peer connection with: ${peerId}`);
    const pc = getOrCreatePeer(peerId);
    if (!pc) return;
    if (shouldCreateOffer){
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        // server expects (offer, to)
        await connection.invoke("SendOffer", pc.localDescription, peerId);
        console.log(`📤 Sent offer to: ${peerId}`);
      } catch (err) {
        console.error("❌ Error creating offer:", err);
      }
    }
  };
  // Start screen share
  const startScreenShare = async () => {
    if (!connectionRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: false
      });

      setScreenStream(stream);

      const screenVideoTrack = stream.getVideoTracks()[0];

      // Replace video track in all peers
      peersRef.current.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === "video");
        if (sender) sender.replaceTrack(screenVideoTrack);
      });

      // Update local preview
      if (localVideoRef.current) {
        const previewStream = new MediaStream([screenVideoTrack, ...localStreamRef.current.getAudioTracks()]);
        localVideoRef.current.srcObject = previewStream;
      }

      // Listen for user manually stopping screen share via browser UI
      const handleStop = () => {
        stopScreenShare();
      };

      screenVideoTrack.onended = handleStop;

      // Extra safeguard: in case all tracks are ended
      stream.getTracks().forEach(track => track.addEventListener('ended', handleStop));

    } catch (err) {
      console.error("Screen sharing failed:", err);
    }
  };
  // Stop screen share
  const stopScreenShare = () => {
    if (!screenStream) return;

    // Restore camera video track
    const cameraVideoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (cameraVideoTrack) {
      peersRef.current.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === "video");
        if (sender) sender.replaceTrack(cameraVideoTrack);
      });

      // Update local preview using a cloned camera stream
      if (localVideoRef.current) {
        const previewStream = new MediaStream([cameraVideoTrack, ...localStreamRef.current.getAudioTracks()]);
        localVideoRef.current.srcObject = previewStream;
      }
    }

    // Stop screen stream tracks
    screenStream.getTracks().forEach(track => track.stop());
    setScreenStream(null);
  };



 return (
  <div className="relative flex flex-col min-h-screen bg-gray-900 text-white overflow-x-hidden pt-16">
    {/* Header */}
    <header className="w-full bg-gray-800 p-4 flex justify-between items-center shadow-md z-20">
      <h1 className="text-xl font-semibold">Room: {code}</h1>
    </header>

    {/* Floating vertical menu on the right */}
    {!sidebarOpen && (
      <div className="fixed right-0 top-1/2 -translate-y-1/2 flex flex-col items-center space-y-4 z-40">
        {/* Group Chat Button */}
        <button
          onClick={toggleSidebar}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-l-full shadow-lg transition-transform transform hover:scale-110"
          title="Group Chat"
          style={{
            position: "fixed",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            borderTopLeftRadius: "9999px",
            borderBottomLeftRadius: "9999px",
          }}
        >
          <MessageSquare size={24} />
        </button>
      </div>
    )}

    {/* Bottom Menu Bar */}
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center bg-gray-800 bg-opacity-80 rounded-full px-6 py-3 space-x-6 shadow-lg backdrop-blur-sm z-40">
    {/* Leave Call */}
    <button
      onClick={() => {
        leaveRoom();
        navigate("/roomDashboard");
      }}
      className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-md transition-transform transform hover:scale-110"
      title="Leave Call"
    >
        <PhoneOff className="w-6 h-6" />
    </button>

    {/* Screen Share */}
    <button
     onClick={() => {
        if (screenStream) stopScreenShare();
        else startScreenShare();
      }}
      className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full shadow-md transition-transform transform hover:scale-110"
      title="Screen Share"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.75 17h4.5M4 5h16v10H4V5zm16 10v4H4v-4"
        />
      </svg>
    </button>

    {/* Canvas */}
    <button
      onClick={() => setShowCanvas(true)}
      className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full shadow-md transition-transform transform hover:scale-110"
      title="Open Canvas"
    >
      <PenTool className="w-6 h-6" />
      </button>
    </div>


    {/* Main video area */}
    <main className="flex-1 flex flex-col items-center justify-center p-4 relative">
      {roomVerified ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 justify-center w-full max-w-6xl">
            {/* Local video */}
              <VideoContainer label="You">
              {localStream && localStream.getVideoTracks().length > 0 ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg">No Camera</div>
                    <div className="text-sm text-gray-400">Audio Only</div>
                  </div>
                </div>
              )}
            </VideoContainer>

            {/* Remote videos */}
            {[...remoteStreams.entries()].map(([peerId, stream]) => (
              <RemoteVideo key={peerId} stream={stream} peerId={peerId} />
            ))}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-xl">Verifying Room...</p>
        </div>
      )}
    </main>

    {/* Sidebar (Group Chat) */}
    <aside
      className={`fixed top-15 right-0 h-[calc(100%-4rem)] w-80 bg-gray-800 text-white shadow-lg transform transition-transform duration-300 ease-in-out z-30 ${
        sidebarOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Group Chat</h2>
          <button
            onClick={toggleSidebar}
            className="text-gray-400 hover:text-white transition"
          >
            ✖
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-gray-400 mt-4">No messages yet...</p>
          ) : (          
          messages.map((m, i) => {
            const isMine = m.senderId === currentUserId;
            const isFile =
              m.message.startsWith("http") &&
              /\.(pdf|jpg|jpeg|png|gif|mp4|zip|docx|txt)$/i.test(m.message);

            // Extract filename from URL if it's a file
            const fileName = isFile
            ? decodeURIComponent(m.message.split("/").pop().replace(/^[\w-]+_/, ""))
            : "";
            return (
              <div key={i} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`px-3 py-2 rounded-lg max-w-[70%] ${
                    isMine ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-100"
                  }`}
                >
                  {isFile ? (
                    <a
                      href={m.message}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 underline hover:text-blue-200"
                    >
                      <FileTextIcon className="w-4 h-4" />
                      <span>{fileName}</span>
                    </a>
                  ) : (
                    <p>{m.message}</p>
                  )}

                  <small className="block text-xs opacity-70 mt-1 text-right">
                    {new Date(m.sentAt || m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </div>
              </div>
            )
          }))}
        </div>

        <GroupChat
        groupChatRef={groupChatRef}
        code={code}
        messages={messages}
        currentUserId={currentUserId}
        />
      </div>
    </aside>

    {showCanvas && (
      <DrawingCanvas
      setShowCanvas={setShowCanvas}
      onDraw={(data) => {
        if(canvasDrawingRef.current){
          canvasDrawingRef.current.invoke("SendCanvasData" ,code, data);
        }
        setCanvasHistory((prev) => [...prev, data]);
      }}
      strokes={canvasHistory}
      setStrokes={setCanvasHistory}
      remoteDrawData={remoteDrawData}
      />
    )}
  </div>
);

}

function RemoteVideo({ stream, peerId }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [, setTick] = useState(0); // used to trigger re-render on track changes

  useEffect(() => {
    if (!stream) return;

    // attach stream to elements
    if (videoRef.current) videoRef.current.srcObject = stream;
    if (audioRef.current) audioRef.current.srcObject = stream;

    const handleTrackChange = () => {
      setTick(t => t + 1); // force re-render when tracks change
    };

    stream.addEventListener("addtrack", handleTrackChange);
    stream.addEventListener("removetrack", handleTrackChange);

    return () => {
      stream.removeEventListener("addtrack", handleTrackChange);
      stream.removeEventListener("removetrack", handleTrackChange);
    };
  }, [stream]);

  const hasVideo = stream && stream.getVideoTracks().length > 0;
  const hasAudio = stream && stream.getAudioTracks().length > 0;

  return (
    <VideoContainer label={`Remote ${peerId?.slice(0 , 6)}`}>
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full bg-black object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white">
          <div className="text-center">
            <div className="text-lg">{hasAudio ? "Audio Only" : "No Media"}</div>
            <div className="text-sm">Remote User</div>
          </div>
        </div>
      )}

      <audio ref={audioRef} autoPlay playsInline className="hidden" />
      
      <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
        Remote {hasAudio ? "🔊" : "🔇"} {hasVideo ? "📹" : "📵"}
      </div>
      <div className="absolute top-2 right-2 bg-gray-700 text-white text-xs px-2 py-1 rounded">
        {peerId?.slice(0, 6)}
      </div>
    </VideoContainer>
  );
}

