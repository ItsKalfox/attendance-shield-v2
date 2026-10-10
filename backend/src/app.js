const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const dns = require('dns');

// Fix for Node.js IPv6 and local DNS resolution issues with MongoDB Atlas
dns.setServers(['1.1.1.1', '8.8.8.8']);
dns.setDefaultResultOrder('ipv4first');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS configuration
const corsOptions = {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
};

// Enable CORS
app.use(cors(corsOptions));

// Setup socket.io
const io = new Server(server, {
    cors: corsOptions
});

io.on('connection', (socket) => {
    socket.on('join_session', (sessionId) => {
        socket.join(sessionId);
    });
});

// Pass io to req so controllers can use it
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/organizations', require('./routes/organizationRoutes'));
app.use('/api/invitations', require('./routes/invitationRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));

// Basic route
app.get('/', (req, res) => {
    res.json({ message: 'Attendance Platform API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
