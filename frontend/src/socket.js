// src/socket.js
import { io } from "socket.io-client";

const socket = io("https://89d824d78988.ngrok-free.app"); // Use backend URL when deployed

export default socket;
