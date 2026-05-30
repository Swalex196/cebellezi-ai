const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB Database
connectDB();

const app = express();
const server = http.createServer(app);

// Setup Socket.io
const io = socketio(server, {
  cors: {
    origin: '*', // Allow all origins for local development
    methods: ['GET', 'POST']
  }
});

// Pass socket.io reference to the express app object
app.set('io', io);

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log(`New Socket Client Connected: ${socket.id}`);

  // Listen for user join event to put socket into a user-specific private room
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User socket [${socket.id}] joined private room [${userId}]`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket Client Disconnected: ${socket.id}`);
  });
});

// Configure CORS and standard request parsers
app.use(cors());
app.use(express.json());

// Serve static receipt uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Map REST API routers
app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/debts', require('./routes/debts'));

// Default Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Cebellezi AI API Server is running successfully.' });
});

// Start listening
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Express API Server running on port ${PORT}`);
});
