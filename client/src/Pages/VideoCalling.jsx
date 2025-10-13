import { useEffect, useRef, useState } from "react";
import { socket } from "../utils/socket";
import { useNavigate, useParams } from "react-router";
import axios from "axios";

// What to handle next
// people may refuse to show their camera so we need to add a default for that 
// add a mute button
// add a leave call button
// before entering a call immediatly we need to actually give the user the option to create a room and 
// invite others (I have no fucking clue how to do so)
// from any room users can share their screens so add a share screen button
// users can write or draw on a white board(canvas) so add that
// users can share files so we'll need to add that too


// Use public STUN to get connectivity (no TURN here because application is small)
const RTC_CONFIG = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
};

// base url for server
const BASE_URL = import.meta.env.VITE_BASE_URL;

export function VideoCalling() {
  const {code} = useParams();// take room code from href
  const navigate = useNavigate();

  const [roomVerified , setRoomVerified] = useState(false);


  const localVideoRef = useRef(null);// to get your own camera/audio
  const localStreamRef = useRef(null);// to store your own stream to send for others

  // Map of peerId -> RTCPeerConnection
  const peersRef = useRef(new Map());

  // Map of peerId -> MediaStream for UI
  const [remoteStreams, setRemoteStreams] = useState(new Map());

  // Helper to update UI map immutably
  const setRemoteStreamFor = (peerId, stream) => {
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      if (stream) next.set(peerId, stream);
      else next.delete(peerId);
      return next;
    });
  };

  // check link for room code and if user logged in
  useEffect(() =>{
    const token = localStorage.getItem('token');
    if (!token){
      navigate('/');// redirect to login
      return;
    }

    const verifyRoomCode = async () =>{
      try{
        const response = await axios.post(`${BASE_URL}/api/rooms/verify/${code}` , {} , {
          headers:{
            Authorization : `Bearer ${token}`
          }
        });
        const verified = response.data.exists;
        if(!verified){
          alert("Room doesn't exist");
          setTimeout(() =>{
            navigate("/dashboard");
          } , 2000);
        }else{
          setRoomVerified(true);
        }
      }catch(err){  
        alert(err.response?.message || 'Server error');
      }
    }
    verifyRoomCode();
  } , [code]);

  useEffect(() => {
    if(!roomVerified) return;// wait 
    let mounted = true;

    // 1) Get local media
    const startLocal = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (!mounted) return;

      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      socket.emit("join-room", code);// join through room code
    };

    startLocal();

    // ######## Socket handlers ########
    // Existing users in the room -> create offers to each
    const onAllUsers = async (users) => {
      for (const peerId of users) {
        await createPeerAndOffer(peerId);
      }
    };

    // We got an offer -> create peer (if not exists), set remote desc, make answer
    const onOffer = async ({ from, offer }) => {
      const pc = getOrCreatePeer(from);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer", { to: from, answer: pc.localDescription });
    };

    // We got an answer -> complete handshake
    const onAnswer = async ({ from, answer }) => {
      const pc = peersRef.current.get(from);
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    // ICE candidates
    const onIceCandidate = async ({ from, candidate }) => {
      const pc = peersRef.current.get(from);
      if (!pc || !candidate) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn("Error adding ICE candidate", e);
      }
    };

    // When a user leaves
    const onUserLeft = (peerId) => {
      const pc = peersRef.current.get(peerId);
      if (pc) {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.close();
        peersRef.current.delete(peerId);
      }
      setRemoteStreamFor(peerId, null);
    };

    socket.on("all-users", onAllUsers);
    socket.on("offer", onOffer);
    socket.on("answer", onAnswer);
    socket.on("ice-candidate", onIceCandidate);
    socket.on("user-left", onUserLeft);

    return () => {
      mounted = false;

      // Clean up sockets
      socket.off("all-users", onAllUsers);
      socket.off("offer", onOffer);
      socket.off("answer", onAnswer);
      socket.off("ice-candidate", onIceCandidate);
      socket.off("user-left", onUserLeft);

      // Stop local tracks
      localStreamRef.current?.getTracks().forEach((t) => t.stop());

      // Close peer connections
      for (const [, pc] of peersRef.current) {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.close();
      }
      peersRef.current.clear();
      setRemoteStreams(new Map());
    };
  }, [roomVerified]);

  // ---- helpers ----
  const getOrCreatePeer = (peerId) => {
    let pc = peersRef.current.get(peerId);
    if (pc) return pc;

    pc = new RTCPeerConnection(RTC_CONFIG);
    peersRef.current.set(peerId, pc);

    // Send our local tracks to this peer
    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current);
    });

    // Gather ICE and send to remote
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("ice-candidate", {
          to: peerId,
          candidate: e.candidate,
        });
      }
    };

    // When we receive remote tracks
    const remoteStream = new MediaStream();
    pc.ontrack = (e) => {
      // Add all tracks to a single stream per peer
      e.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t));
      setRemoteStreamFor(peerId, remoteStream);
    };

    // connection state logs
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        // Clean up failed peers
        pc.close();
        peersRef.current.delete(peerId);
        setRemoteStreamFor(peerId, null);
      }
    };

    return pc;
  };

  const createPeerAndOffer = async (peerId) => {
    const pc = getOrCreatePeer(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("offer", { to: peerId, offer: pc.localDescription });
  };

  // ---- UI ----
 return (
  <>
    {roomVerified ? (
        <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-semibold mb-6 text-white text-center">Video Call Room</h1>

          {/* Video Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 justify-center">
            {/* Local Video */}
            <div className="relative rounded-xl overflow-hidden shadow-lg border-2 border-blue-500 w-64 h-48">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full bg-black object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                You
              </div>
            </div>

            {/* Remote Videos */}
            {[...remoteStreams.entries()].map(([peerId, stream]) => (
              <RemoteVideo key={peerId} stream={stream} />
            ))}
          </div>
      </div>
    ) : (
      <p>Verifying Room...</p>
    )}
  </>

);

}

function RemoteVideo({ stream }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative rounded-xl overflow-hidden shadow-lg border-2 border-gray-700 w-64 h-48">
      <video autoPlay playsInline ref={ref} className="w-full h-full bg-black object-cover" />
    </div>
  );
}
