const mongoose = require('mongoose');

const passwordResetOTPSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    otpHash: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    used: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PasswordResetOTP', passwordResetOTPSchema);
