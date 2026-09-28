const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: 50
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: 50
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    passwordHash: {
        type: String,
        required: [true, 'Password is required'],
        select: false
    },
    avatar: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'SUSPENDED'],
        default: 'ACTIVE'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);
