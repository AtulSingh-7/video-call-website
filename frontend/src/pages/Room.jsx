import React, { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import socket from "../socket";

// const socket = io("https://89d824d78988.ngrok-free.app"); // Update if using different host


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
    console.log("Joined room:", roomId);

    // Get local stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    });
    console.log("Local stream:", localStream);

    // Another user joined
    socket.on("user-joined", async ({ userId }) => {
      console.log(`${userId} joined`);

      const peerConnection = createPeerConnection(userId);
      peerConnections.current[userId] = peerConnection;

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });
      console.log("Local stream added to peer connection");

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      console.log("Offer created");

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
      console.log("Local stream added to peer connection");

      await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      console.log("Remote description set");
      const answer = await peerConnection.createAnswer();
      console.log("Answer created");
      await peerConnection.setLocalDescription(answer);
      console.log("Local description set");

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
      console.log("Remote description set");
    });
    console.log("Answer received");

    // ICE Candidate received
    socket.on("ice-candidate", async ({ from, candidate }) => {
      const peerConnection = peerConnections.current[from];
      if (peerConnection && candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
    console.log("ICE candidate received");

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
    console.log("Peer connection created");

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
      console.log("Remote stream added to peer connection");

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
