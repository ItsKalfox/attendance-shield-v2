const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 250, // Handle 200-300 simultaneous student check-ins
            minPoolSize: 20,  // Pre-warmed sockets ready for sudden bursts
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Initialize background session status synchronization job
        const { initSessionSyncJob } = require('../services/sessionService');
        initSessionSyncJob();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
