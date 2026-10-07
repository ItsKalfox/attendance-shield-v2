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
    batch: {
        type: String,
        required: [true, 'Batch is required'],
        trim: true
    },
    semester: {
        type: String,
        required: [true, 'Semester is required'],
        trim: true
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember',
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['ONGOING', 'COMPLETED'],
        default: 'ONGOING'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Course', courseSchema);
