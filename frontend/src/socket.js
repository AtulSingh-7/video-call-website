// src/socket.js
import { io } from "socket.io-client";

const socket = io("https://bde3e4625e52.ngrok-free.app"); // Use backend URL when deployed

export default socket;