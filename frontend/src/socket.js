// src/socket.js
import { io } from "socket.io-client";

const socket = io("http://localhost:5000"); // Use backend URL when deployed

export default socket;
