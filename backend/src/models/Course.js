const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Course name is required'],
        trim: true
    },
    code: {
        type: String,
        required: [true, 'Course code is required'],
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    instructors: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    }],
    status: {
        type: String,
        enum: ['ACTIVE', 'ARCHIVED'],
        default: 'ACTIVE'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Course', courseSchema);
