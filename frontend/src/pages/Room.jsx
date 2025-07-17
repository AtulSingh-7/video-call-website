import React, { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000"); // Update if using different host

const Room = () => {
  const { roomId } = useParams();
  const { state } = useLocation();
  const userName = state?.userName || "Guest";

  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const localVideoRef = useRef(null);
  const peerConnections = useRef({});

  useEffect(() => {
    // Join room
    socket.emit("join-room", { roomId, userName });

    // Get local stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    });

    // Another user joined
    socket.on("user-joined", async ({ userId }) => {
      console.log(`${userId} joined`);

      const peerConnection = createPeerConnection(userId);
      peerConnections.current[userId] = peerConnection;

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit("offer", {
        to: userId,
        from: socket.id,
        sdp: offer,
      });
    });

    // Received offer
    socket.on("offer", async ({ from, sdp }) => {
      const peerConnection = createPeerConnection(from);
      peerConnections.current[from] = peerConnection;

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit("answer", {
        to: from,
        from: socket.id,
        sdp: answer,
      });
    });

    // Received answer
    socket.on("answer", async ({ from, sdp }) => {
      const peerConnection = peerConnections.current[from];
      await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    // ICE Candidate received
    socket.on("ice-candidate", async ({ from, candidate }) => {
      const peerConnection = peerConnections.current[from];
      if (peerConnection && candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    return () => {
      socket.disconnect();
      Object.values(peerConnections.current).forEach((pc) => pc.close());
    };
  }, [localStream]);

  // Create new PeerConnection for each user
  const createPeerConnection = (userId) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          to: userId,
          from: socket.id,
          candidate: event.candidate,
        });
      }
    };

    const remoteStream = new MediaStream();
    peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });

      setRemoteStreams((prev) => {
        // Avoid adding same stream twice
        if (prev.find((s) => s.userId === userId)) return prev;
        return [...prev, { userId, stream: remoteStream }];
      });
    };

    return peerConnection;
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Room: {roomId}</h2>

      <div className="mb-4">
        <h3 className="text-md font-semibold mb-1">Your Video</h3>
        <video
          autoPlay
          playsInline
          muted
          ref={localVideoRef}
          className="w-[300px] h-[220px] rounded shadow-lg"
        />
      </div>

      <div className="mt-6">
        <h3 className="text-md font-semibold mb-2">Other Participants</h3>
        <div className="flex flex-wrap gap-4">
          {remoteStreams.map(({ userId, stream }) => (
            <div key={userId}>
              <p className="text-sm mb-1">{userId}</p>
              <video
                autoPlay
                playsInline
                ref={(video) => {
                  if (video) video.srcObject = stream;
                }}
                className="w-[300px] h-[220px] rounded shadow-md"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Room;
