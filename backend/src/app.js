const express = require('express');
const cors = require('cors');
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

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enable CORS
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
}));

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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
