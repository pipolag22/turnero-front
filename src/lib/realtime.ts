import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';


export const socket = io(URL, {
  transports: ['websocket'],
  autoConnect: true,
});


export function joinPublicRooms() {
  socket.emit('subscribe', { rooms: [
    'public:stage:LIC_DOCS_IN_SERVICE',
    'public:stage:WAITING_PSY',
    'public:stage:PSY_IN_SERVICE',
    'public:stage:WAITING_LIC_RETURN',
  ]});
}
