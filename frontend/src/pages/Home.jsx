// src/pages/Home.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    const id = uuidv4();
    navigate(`/room/${id}`);
  };

  const handleJoinRoom = () => {
    if (roomId.trim() !== "") {
      navigate(`/room/${roomId}`);
    }
  };

  return (
    <div className="h-screen flex flex-col justify-center items-center gap-6 bg-gray-100">
      <h1 className="text-3xl font-bold">🎥 Video Chat App</h1>
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="p-2 border rounded"
        />
        <button
          onClick={handleJoinRoom}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Join Room
        </button>
      </div>
      <button
        onClick={handleCreateRoom}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Create Room
      </button>
    </div>
  );
}
