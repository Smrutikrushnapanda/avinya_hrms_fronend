import { io, Socket } from "socket.io-client";

const SOCKET_FALLBACK_URL = "https://avinya-hrms-backend.onrender.com";

export const getSocketUrl = () =>
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_LOCAL_API_BASE_URL ||
  SOCKET_FALLBACK_URL;

export const createMessageSocket = (token: string): Socket =>
  io(getSocketUrl(), {
    auth: { token },
    transports: ["websocket"],
  });
