const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        maxlength: 100
    },
    firstName: {
        type: String,
        trim: true,
        default: '',
        maxlength: 50
    },
    lastName: {
        type: String,
        trim: true,
        default: '',
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
    },
    authProvider: {
        type: String,
        enum: ['LOCAL', 'GOOGLE', 'MICROSOFT'],
        default: 'LOCAL'
    },
    preferences: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Synchronize name <-> firstName & lastName
userSchema.pre('validate', function() {
    if (this.name) {
        this.name = this.name.trim();
        if (!this.firstName && !this.lastName) {
            const parts = this.name.split(/\s+/);
            this.firstName = parts[0] || 'User';
            this.lastName = parts.slice(1).join(' ') || '';
        }
    } else if (this.firstName || this.lastName) {
        this.name = `${this.firstName || ''} ${this.lastName || ''}`.trim();
    }
    if (!this.firstName && !this.name) {
        this.firstName = 'User';
        this.name = 'User';
    }
});

module.exports = mongoose.model('User', userSchema);
