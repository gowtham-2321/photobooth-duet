const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 10 * 1024 * 1024  // 10MB — enough for full-res photos
});

// Serve the frontend
app.use(express.static(path.join(__dirname, 'public')));

// ─── Room state ───────────────────────────────────────────────
// rooms[code] = { host: socketId, guest: socketId | null, filter: string }
const rooms = {};

function cleanup(socketId) {
  for (const [code, room] of Object.entries(rooms)) {
    if (room.host === socketId || room.guest === socketId) {
      const partnerId = room.host === socketId ? room.guest : room.host;
      if (partnerId) {
        io.to(partnerId).emit('partner_left');
      }
      delete rooms[code];
      console.log(`Room ${code} closed`);
    }
  }
}

// ─── Socket events ────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('connected:', socket.id);

  // Host creates a room
  socket.on('create_room', (code) => {
    if (rooms[code]) {
      socket.emit('error_msg', 'room already exists');
      return;
    }
    rooms[code] = { host: socket.id, guest: null, filter: 'none' };
    socket.join(code);
    socket.emit('room_created', code);
    console.log(`Room ${code} created by ${socket.id}`);
  });

  // Guest joins a room
  socket.on('join_room', (code) => {
    const room = rooms[code];
    if (!room) {
      socket.emit('error_msg', 'room not found');
      return;
    }
    if (room.guest) {
      socket.emit('error_msg', 'room is full');
      return;
    }
    room.guest = socket.id;
    socket.join(code);

    // Tell guest they're in, and send current filter
    socket.emit('joined_room', { code, filter: room.filter });

    // Tell host their partner arrived
    io.to(room.host).emit('partner_joined');
    console.log(`Room ${code}: guest ${socket.id} joined`);
  });

  // Host picks a filter — relay to guest
  socket.on('set_filter', ({ code, filter }) => {
    const room = rooms[code];
    if (!room || room.host !== socket.id) return;
    room.filter = filter;
    socket.to(code).emit('filter_changed', filter);
  });

  // Host starts the booth — relay to guest
  socket.on('start_booth', ({ code, filter }) => {
    const room = rooms[code];
    if (!room || room.host !== socket.id) return;
    room.filter = filter;
    socket.to(code).emit('booth_started', filter);
  });

  // Ready signal — relay to partner
  socket.on('ready', (code) => {
    socket.to(code).emit('partner_ready');
  });

  // Countdown tick from host — relay to guest
  socket.on('countdown', ({ code, n }) => {
    socket.to(code).emit('countdown', n);
  });

  // Fire signal from host — relay to guest
  socket.on('fire', (code) => {
    socket.to(code).emit('fire');
  });

  // Photo from either side — relay to partner
  socket.on('photo', ({ code, shot, data }) => {
    socket.to(code).emit('photo', { shot, data });
  });

  // Video preview frame — relay to partner (low priority)
  socket.on('frame', ({ code, data }) => {
    socket.to(code).emit('frame', data);
  });

  socket.on('disconnect', () => {
    console.log('disconnected:', socket.id);
    cleanup(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Photobooth server running on port ${PORT}`);
});
